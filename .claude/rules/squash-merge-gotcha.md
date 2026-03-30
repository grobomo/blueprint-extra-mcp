# Squash Merge + Feature Branch Gotcha

When using task branches off a feature branch with squash merge PRs:

1. Squash merge a task PR into the feature branch
2. `git pull` on the feature branch creates a merge commit (local diverges from remote squash)
3. New task branches inherit this divergent history
4. The next squash merge PR shows an EMPTY diff because the merge commit already "resolved" the changes

**Fix**: For this repo, PR task branches directly to `main` instead of nesting through a feature branch. Or create clean branches from main and cherry-pick commits when the feature branch gets polluted by merge commits.
