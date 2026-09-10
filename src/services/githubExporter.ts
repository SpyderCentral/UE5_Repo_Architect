/**
 * GitHub Integration Service for Unreal Engine Project Export
 * Supports pushing generated automation scripts, C++ scaffolding, and project JSON
 * directly to a connected GitHub repository via GitHub REST API.
 */

export interface GitHubPushConfig {
  owner: string;
  repo: string;
  branch: string;
  token: string;
  commitMessage: string;
}

export interface StagedFile {
  path: string;
  content: string;
  description: string;
  sizeBytes: number;
  selected: boolean;
}

export interface GitHubPushResult {
  success: boolean;
  commitSha?: string;
  commitUrl?: string;
  filesCommitted?: number;
  branch?: string;
  repoFullName?: string;
  error?: string;
}

export interface GitHubRepoDetails {
  fullName: string;
  defaultBranch: string;
  isPrivate: boolean;
  description?: string;
  htmlUrl: string;
}

/**
 * Validates access to a GitHub repository using a Personal Access Token (PAT)
 */
export async function verifyGitHubRepository(
  owner: string,
  repo: string,
  token: string
): Promise<{ valid: boolean; details?: GitHubRepoDetails; error?: string }> {
  try {
    const cleanToken = token.trim();
    const headers: Record<string, string> = {
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'UE5-Architect-Push-Client'
    };

    if (cleanToken) {
      headers['Authorization'] = `token ${cleanToken}`;
    }

    const response = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
      method: 'GET',
      headers
    });

    if (!response.ok) {
      if (response.status === 404) {
        return { valid: false, error: `Repository "${owner}/${repo}" not found or token lacks permissions.` };
      }
      if (response.status === 401) {
        return { valid: false, error: 'Invalid Personal Access Token. Please check token permissions.' };
      }
      const data = await response.json().catch(() => ({}));
      return { valid: false, error: data.message || `GitHub error (Status ${response.status})` };
    }

    const data = await response.json();
    return {
      valid: true,
      details: {
        fullName: data.full_name,
        defaultBranch: data.default_branch || 'main',
        isPrivate: data.private,
        description: data.description,
        htmlUrl: data.html_url
      }
    };
  } catch (err: any) {
    return { valid: false, error: err.message || 'Network error connecting to GitHub API' };
  }
}

/**
 * Pushes multiple files to a GitHub repository on the specified branch.
 * Creates or updates each file sequentially using GitHub Contents API.
 */
export async function pushFilesToGitHub(
  config: GitHubPushConfig,
  files: StagedFile[],
  onProgress?: (current: number, total: number, currentFile: string) => void
): Promise<GitHubPushResult> {
  const { owner, repo, branch, token, commitMessage } = config;
  const cleanToken = token.trim();

  if (!cleanToken) {
    return {
      success: false,
      error: 'GitHub Personal Access Token is required to commit files.'
    };
  }

  const selectedFiles = files.filter(f => f.selected);
  if (selectedFiles.length === 0) {
    return {
      success: false,
      error: 'No files selected to push.'
    };
  }

  const headers: Record<string, string> = {
    'Accept': 'application/vnd.github.v3+json',
    'Authorization': `token ${cleanToken}`,
    'User-Agent': 'UE5-Architect-Push-Client',
    'Content-Type': 'application/json'
  };

  let lastCommitSha: string | undefined;

  try {
    for (let i = 0; i < selectedFiles.length; i++) {
      const file = selectedFiles[i];
      if (onProgress) {
        onProgress(i + 1, selectedFiles.length, file.path);
      }

      // Check if file already exists on this branch to get its SHA
      let fileSha: string | undefined;
      const getFileUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${file.path}?ref=${encodeURIComponent(branch)}`;
      
      const checkRes = await fetch(getFileUrl, { method: 'GET', headers });
      if (checkRes.ok) {
        const fileData = await checkRes.json();
        fileSha = fileData.sha;
      }

      // Encode UTF-8 content to base64 properly
      const base64Content = utf8ToBase64(file.content);

      const putUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${file.path}`;
      const payload: any = {
        message: `${commitMessage} - ${file.path}`,
        content: base64Content,
        branch
      };

      if (fileSha) {
        payload.sha = fileSha;
      }

      const putRes = await fetch(putUrl, {
        method: 'PUT',
        headers,
        body: JSON.stringify(payload)
      });

      if (!putRes.ok) {
        const errorData = await putRes.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to push ${file.path} (HTTP ${putRes.status})`);
      }

      const resData = await putRes.json();
      if (resData.commit && resData.commit.sha) {
        lastCommitSha = resData.commit.sha;
      }
    }

    const repoFullName = `${owner}/${repo}`;
    const commitUrl = lastCommitSha
      ? `https://github.com/${repoFullName}/commit/${lastCommitSha}`
      : `https://github.com/${repoFullName}/tree/${branch}`;

    return {
      success: true,
      commitSha: lastCommitSha,
      commitUrl,
      filesCommitted: selectedFiles.length,
      branch,
      repoFullName
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'Error executing push to GitHub repository'
    };
  }
}

/**
 * Encodes a UTF-8 string to base64 safely in browser environment
 */
function utf8ToBase64(str: string): string {
  try {
    return btoa(unescape(encodeURIComponent(str)));
  } catch {
    const bytes = new TextEncoder().encode(str);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }
}

/**
 * Parses user repo input string like "https://github.com/user/my-game" or "user/my-game"
 */
export function parseGitHubRepoInput(input: string): { owner: string; repo: string } | null {
  if (!input) return null;
  const clean = input.trim().replace(/\/+$/, '').replace(/\.git$/, '');

  // Full URL
  const urlMatch = clean.match(/github\.com\/([^/]+)\/([^/]+)/);
  if (urlMatch) {
    return { owner: urlMatch[1], repo: urlMatch[2] };
  }

  // "owner/repo" shorthand
  const parts = clean.split('/');
  if (parts.length === 2 && parts[0] && parts[1]) {
    return { owner: parts[0], repo: parts[1] };
  }

  return null;
}

export type GitHubFilePayload = StagedFile;
export const parseRepoString = parseGitHubRepoInput;

/**
 * Convenience helper to verify repository using either 'owner/repo' or separate args
 */
export async function verifyGitHubRepoConvenient(
  repoInput: string,
  token: string
): Promise<{ valid: boolean; message: string; defaultBranch?: string; details?: GitHubRepoDetails }> {
  const parsed = parseGitHubRepoInput(repoInput);
  if (!parsed) {
    return { valid: false, message: 'Invalid repo format. Use "owner/repo" or full GitHub URL.' };
  }
  const res = await verifyGitHubRepository(parsed.owner, parsed.repo, token);
  if (res.valid && res.details) {
    return {
      valid: true,
      message: `Connected to ${res.details.fullName} (${res.details.defaultBranch})`,
      defaultBranch: res.details.defaultBranch,
      details: res.details
    };
  }
  return {
    valid: false,
    message: res.error || 'Repository verification failed'
  };
}
