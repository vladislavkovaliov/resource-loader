# Настройка semantic-release — универсальный план

## 1. Установка зависимостей

```bash
npm install -D semantic-release \
  @semantic-release/commit-analyzer \
  @semantic-release/release-notes-generator \
  @semantic-release/changelog \
  @semantic-release/npm \
  @semantic-release/git \
  @semantic-release/github \
  conventional-changelog-conventionalcommits
```

## 2. Конфиг `release.config.cjs`

Если в `package.json` есть `"type": "module"`, файл **обязательно** должен быть `.cjs` (CommonJS). Если `type` не указан — можно `.js`.

```js
/**
 * @type {import('semantic-release').Options}
 */
module.exports = {
    branches: [
        'main',                        // стабильные релизы
        { name: 'beta', prerelease: true },  // pre-release
        { name: 'rc/*', range: '<%= name.replace(/^rc\\//, "") %>' },
    ],
    plugins: [
        [
            '@semantic-release/commit-analyzer',
            { preset: 'conventionalcommits' },
        ],
        [
            '@semantic-release/release-notes-generator',
            {
                preset: 'conventionalcommits',
                presetConfig: {
                    types: [
                        { type: 'feat', section: 'Features' },
                        { type: 'fix', section: 'Fixes' },
                        { type: 'perf', section: 'Performance Improvements' },
                        { type: 'revert', section: 'Reverts' },
                        { type: 'docs', section: 'Documentation' },
                        { type: 'style', section: 'Styles' },
                        { type: 'chore', section: 'Chores' },
                        { type: 'refactor', section: 'Code Refactoring' },
                        { type: 'test', section: 'Tests' },
                        { type: 'build', section: 'Build' },
                        { type: 'ci', section: 'CI/CD' },
                    ],
                },
                writerOpts: {
                    commitPartial: '* {{header}}{{#if hash}} ({{shortHash}}){{/if}}\n',
                },
            },
        ],
        '@semantic-release/changelog',
        [
            '@semantic-release/npm',
            { npmPublish: true },
        ],
        [
            '@semantic-release/git',
            { assets: ['package.json', 'CHANGELOG.md'] },
        ],
        '@semantic-release/exec',
        [
            '@semantic-release/github',
            { draftRelease: true },
        ],
    ],
};
```

**Branches — пояснение:**
- Просто имя ветки (`'main'`) → стабильный релиз (`v1.0.0`)
- `prerelease: true` → релиз с pre-release тегом (`v1.0.0-beta.1`)
- `rc/*` с `range` → для release-candidate веток

## 3. `package.json` — обязательные поля

```json
{
  "version": "0.0.0",
  "private": false,
  "files": ["dist", "README.md", "LICENSE"],
  "publishConfig": { "access": "public" },
  "repository": {
    "type": "git",
    "url": "https://github.com/OWNER/REPO"
  },
  "scripts": {
    "prepare": "husky || true",
    "build": "tsup"
  }
}
```

**⚠️ Важно:**
- `"private": false` — **булево**, не строка. Строка `"false"` — truthy, npm откажется публиковать (ошибка `EPRIVATE`).
- **`repository` обязателен** — npm provenance (sigstore) сверяет URL из `package.json` с GitHub Actions окружением.

## 4. `.npmignore` — обязателен для TypeScript-проектов

Когда `.npmignore` существует, npm **игнорирует** `.gitignore`. Это критично, если `dist/` (или `build/`, `lib/`) в `.gitignore`.

```
src
.git
.github
node_modules
```

**Без `.npmignore`** npm использует `.gitignore` как fallback и исключит `dist/` из tarball.

## 5. GitHub Actions — архитектура

### 5.1 Composite action `semantic-release` (переиспользуемый)

**Файл:** `.github/workflows/semantic-release/action.yml`

```yaml
name: 'Semantic Release'
description: 'Reusable semantic-release action for automated versioning and publishing'

inputs:
  branch:
    required: true
  npm-token:
    required: true
  node-version:
    default: '22'
    required: false

outputs:
  new_release_published:
    value: ${{ steps.semantic.outputs.new_release_published }}
  new_release_version:
    value: ${{ steps.semantic.outputs.new_release_version }}

runs:
  using: 'composite'
  steps:
    - uses: actions/setup-node@v4
      with:
        node-version: ${{ inputs.node-version }}

    - name: Install dependencies
      shell: bash
      run: npm ci

    - name: Build
      shell: bash
      run: npm run build

    - name: Semantic Release
      id: semantic
      shell: bash
      env:
        GITHUB_TOKEN: ${{ github.token }}
        NPM_TOKEN: ${{ inputs.npm-token }}
      run: |
        npx --package semantic-release \
            --package @semantic-release/commit-analyzer \
            --package @semantic-release/release-notes-generator \
            --package @semantic-release/changelog \
            --package @semantic-release/npm \
            --package @semantic-release/git \
            --package @semantic-release/exec \
            --package conventional-changelog-conventionalcommits \
            semantic-release --branches ${{ inputs.branch }}
```

**Ключевые моменты:**
- `secrets.*` **недоступны** в composite action → NPM_TOKEN передаётся через `inputs`
- `github.token` **доступен** — его не нужно передавать как input
- `npm ci` + `npm run build` **обязательно** перед semantic-release, иначе собранных файлов не будет в tarball

### 5.2 Release workflow

**Файл:** `.github/workflows/release.yml`

```yaml
name: 'Release'

on:
  workflow_dispatch:
    inputs:
      branch:
        description: 'Branch to release'
        required: true
        default: 'main'

jobs:
  release:
    runs-on: ubuntu-latest
    permissions:
      contents: write
      id-token: write
    steps:
      - uses: actions/checkout@v6
        with:
          ref: ${{ github.event.inputs.branch }}
          fetch-depth: 0
          persist-credentials: true
      - uses: ./.github/workflows/semantic-release
        with:
          branch: ${{ github.event.inputs.branch }}
          npm-token: ${{ secrets.NPM_TOKEN }}
```

**⚠️ Важно:** `permissions: id-token: write` — обязателен для npm provenance. Без него sigstore не сможет подписать.

## 6. GitHub Secrets

В Settings → Secrets and variables → Actions → Repository secrets:

| Secret | Значение |
|--------|----------|
| `NPM_TOKEN` | npm automation token (с правами на публикацию пакета) |

**Тип токена:** **Automation** (не требует 2FA). Если Granular Access — обязательно добавить пакет в разрешённые.

## 7. Первая публикация (локально)

Первый раз публикуется вручную, чтобы "зарегистрировать" пакет в npm:

```bash
npm login
npm run build
npm publish
```

Для scoped-пакета (`@scope/name`):
```bash
npm publish --access public
```

После первой публикации semantic-release сможет публиковать следующие версии автоматически.

## 8. Commit convention

semantic-release анализирует сообщения коммитов. Формат:

```
type(scope): description

[optional body]
```

**Типы и как влияют на версию:**

| Тип | Секция в changelog | bump |
|-----|-------------------|------|
| `feat` | Features | **minor** |
| `fix` | Bug Fixes | **patch** |
| `perf` | Performance | **patch** |
| `BREAKING CHANGE` (в body коммита любого типа) | — | **major** |
| `docs`, `style`, `refactor`, `test`, `build`, `ci`, `chore` | — | нет релиза |

**Примеры коммитов:**
```
feat: add loadScript method
fix(loader): handle timeout correctly
feat: rewrite in TypeScript

BREAKING CHANGE: remove callback API, now returns Promise
```

## 9. Типичные проблемы и их решения

| Симптом | Причина | Решение |
|---------|---------|---------|
| `EPRIVATE` | `"private": "false"` (строка) | Поменять на `false` (булево) |
| `husky: not found` при `npm publish` | `prepare` скрипт падает | `"prepare": "husky || true"` |
| `secrets.NPM_TOKEN` not recognized | Composite action использует `secrets.*` | Передать через `inputs` |
| `dist/` не в tarball | `dist` в `.gitignore`, нет `.npmignore` | Создать `.npmignore` |
| `repository.url is ""` | Нет поля `repository` в `package.json` | Добавить `repository.url` |
| `403 Forbidden` при publish | Токен без прав на пакет | Тип токена Automation/Granular с доступом |
| `422 Unprocessable` (provenance) | `repository.url` не совпадает с GitHub | Синхронизировать URL `https://github.com/owner/repo` |
