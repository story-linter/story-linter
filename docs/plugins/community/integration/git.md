# Git Integration Plugin

**Package**: `@story-linter/plugin-git`
**Author**: Community
**Category**: Integration

## Overview

The Git Integration Plugin seamlessly integrates story validation with Git workflows, providing pre-commit hooks, branch protection rules, collaborative editing support, and version-aware validation. It helps maintain narrative quality throughout the development process.

## Features

### Core Features
- **Pre-commit validation** - Checks before commits
- **Branch protection** - Enforces quality standards
- **Merge conflict resolution** - Smart narrative merging
- **Version tracking** - Links validation to commits
- **Collaborative workflows** - Multi-author support
- **Change detection** - Incremental validation
- **History analysis** - Track quality over time

## Configuration

```yaml
plugins:
  git:
    enabled: true
    hooks:
      preCommit: true
      prePush: true
      commitMsg: true
    validation:
      blockOnError: true
      warnOnly: false
      incrementalOnly: true
    branches:
      protect: ["main", "release/*"]
      requireReview: true
      autoValidate: true
    collaboration:
      trackAuthors: true
      creditLines: true
      conflictHelp: true
    history:
      trackMetrics: true
      generateReports: true
      bisectSupport: true
```

### Configuration Options

#### `hooks`
- `preCommit` (boolean): Run validation before commit
- `prePush` (boolean): Validate before push
- `commitMsg` (boolean): Check commit messages

#### `validation`
- `blockOnError` (boolean): Prevent commits with errors
- `warnOnly` (boolean): Allow commits with warnings
- `incrementalOnly` (boolean): Only check changed files

#### `branches`
- `protect` (array): Branches requiring validation
- `requireReview` (boolean): Mandate PR reviews
- `autoValidate` (boolean): Validate on PR creation

#### `collaboration`
- `trackAuthors` (boolean): Monitor contributions
- `creditLines` (boolean): Maintain author credits
- `conflictHelp` (boolean): Assist with merges

## Git-Specific Features

### Pre-Commit Hook

Automatic validation before commits:

```bash
#!/bin/sh
# .git/hooks/pre-commit
story-linter validate --git-staged --fail-on-error
```

### Branch Protection Rules

Enforce quality standards:

```yaml
protection:
  rules:
    main:
      validation: "required"
      minReviewers: 2
      dismissStale: true
    feature/*:
      validation: "recommended"
      allowBypass: true
```

### Merge Conflict Assistant

Help resolve narrative conflicts:

```yaml
mergeAssist:
  detectType: "narrative"  # narrative, dialogue, timeline
  strategies:
    characterConsistency: "interactive"
    timelineConflicts: "manual"
    dialogueOverlap: "combine"
```

## Validation Rules

### Commit Quality (GIT001)
Ensures meaningful commit messages.

**Example Issue:**
```
Commit: "fix"
// Error: Commit message too vague
```

### File Size Warning (GIT002)
Flags large narrative files.

**Example Issue:**
```
chapter-15.md: 500KB
// Warning: Consider splitting large chapter
```

### Merge Conflict Markers (GIT003)
Detects unresolved conflicts.

**Example Issue:**
```markdown
<<<<<<< HEAD
Sarah walked away.
=======
Sarah ran away.
>>>>>>> feature
// Error: Unresolved conflict markers
```

### Author Attribution (GIT004)
Tracks multi-author sections.

**Example Issue:**
```markdown
Chapter lacks author attribution
// Warning: Enable co-author tracking
```

## Workflow Integration

### Feature Branch Workflow

Support for common Git workflows:

```yaml
workflow:
  type: "feature-branch"
  naming:
    features: "feature/*"
    fixes: "fix/*"
    releases: "release/*"
  validation:
    onPR: "required"
    onMerge: "strict"
```

### Continuous Integration

CI/CD pipeline integration:

```yaml
# .github/workflows/story-lint.yml
name: Story Validation
on: [push, pull_request]
jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Run Story Linter
        run: |
          npm install -g @story-linter/cli
          story-linter validate --reporter github
```

### Git Attributes

Optimize for narrative files:

```gitattributes
# .gitattributes
*.md diff=markdown
*.md merge=union
chapters/*.md linguist-documentation=false
```

## Best Practices

1. **Set up pre-commit hooks** early
2. **Use meaningful commit messages** for story changes
3. **Create feature branches** for major edits
4. **Review changes** before merging
5. **Tag releases** for published versions

## Common Issues and Solutions

### Issue: Large file handling
**Solution**: Git LFS configuration
```yaml
lfs:
  track: ["*.pdf", "*.epub", "images/*"]
  validation: "pointer-only"
```

### Issue: Multi-author attribution
**Solution**: Co-author commits
```yaml
coauthors:
  format: "git"  # git, custom
  credit: "automatic"
  emailRequired: false
```

## Advanced Features

### History Analysis

Track quality metrics over time:

```yaml
history:
  metrics:
    - wordCount
    - validationErrors
    - characterCount
    - complexity
  visualization: true
  export: "csv"
```

### Bisect Support

Find when issues were introduced:

```bash
git bisect start
git bisect bad HEAD
git bisect good v1.0
git bisect run story-linter validate --quick
```

## Integration with Other Plugins

- Metadata (version tracking)
- All validators (incremental checks)
- Publishing (release management)

## Future Enhancements

1. **Smart merge strategies**
2. **Automated changelog generation**
3. **Quality gates dashboard**
4. **Collaborative editing modes**
5. **Git-based review workflows**