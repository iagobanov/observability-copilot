import { Octokit } from "@octokit/rest";
import type { RepoSummary } from "@/types";

export async function listUserRepos(
  accessToken: string
): Promise<RepoSummary[]> {
  const octokit = new Octokit({ auth: accessToken });

  const repos: RepoSummary[] = [];
  let page = 1;

  while (repos.length < 200) {
    const { data } = await octokit.repos.listForAuthenticatedUser({
      sort: "updated",
      per_page: 100,
      page,
    });

    if (data.length === 0) break;

    for (const repo of data) {
      repos.push({
        id: repo.id,
        name: repo.name,
        full_name: repo.full_name,
        owner: repo.owner.login,
        description: repo.description,
        language: repo.language,
        private: repo.private,
        updated_at: repo.updated_at ?? "",
        default_branch: repo.default_branch ?? "main",
      });
    }

    page++;
  }

  return repos;
}

export async function getRepoTree(
  accessToken: string,
  owner: string,
  repo: string
): Promise<string[]> {
  const octokit = new Octokit({ auth: accessToken });

  const { data: repoData } = await octokit.repos.get({ owner, repo });
  const defaultBranch = repoData.default_branch;

  const { data: tree } = await octokit.git.getTree({
    owner,
    repo,
    tree_sha: defaultBranch,
    recursive: "true",
  });

  return tree.tree
    .filter((item) => item.type === "blob" && item.path)
    .map((item) => item.path!);
}

export async function getFileContents(
  accessToken: string,
  owner: string,
  repo: string,
  paths: string[]
): Promise<Map<string, string>> {
  const octokit = new Octokit({ auth: accessToken });
  const contents = new Map<string, string>();

  // Fetch in batches of 10 to avoid rate limits
  const batchSize = 10;
  for (let i = 0; i < paths.length; i += batchSize) {
    const batch = paths.slice(i, i + batchSize);

    const results = await Promise.allSettled(
      batch.map(async (path) => {
        const { data } = await octokit.repos.getContent({
          owner,
          repo,
          path,
        });

        if ("content" in data && data.encoding === "base64" && data.size < 100_000) {
          const decoded = Buffer.from(data.content, "base64").toString("utf-8");
          return { path, content: decoded };
        }
        return null;
      })
    );

    for (const result of results) {
      if (result.status === "fulfilled" && result.value) {
        contents.set(result.value.path, result.value.content);
      }
    }
  }

  return contents;
}
