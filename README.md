<p align="center">
  <img src="/public/assets/header.png" alt="eLeetCode" width="100%" />
</p>

<p align="center">
  <strong>A Github based LeetCode practice database for tracking solutions and reviewing progress, tags, & notes.</strong>
</p>
<p align="center">
  <a href="#demo">Demo</a>
  ·
  <a href="#features">Features</a>
  · 
  <a href="#installation">Install</a>
  · 
  <a href="#github-configuration">GitHub Setup</a>
</p>

---

**eLeetCode** adds a polished tracking layer directly to LeetCode so every accepted solution can become part of a personal practice database. Seamlessly log how a problem felt, save your solution code, mark what needs review, and use the dashboard to decide what to practice next.

https://github.com/user-attachments/assets/84e9781c-76b8-4db8-8098-eb174518d736

## Features

- **Detailed attempt logging**: record personal difficulty, outcome, review flag, tags, notes, duration, and code path.
- **Review analytics**: surface suggested training, solution outcomes, review flags, and tag performance.
- **Practice dashboard**: browse problems, expand attempt history, filter by review state, and open saved code.
- **Accepted submission nudges**: highlights the log button when LeetCode reports an accepted solve.
- **Interactive tags**: reuse existing tags, add new ones quickly, and keep your tracker consistent.
- **GitHub storage**: save `tracker.json` and optional solution files to a repository you control.

## Installation

> [!NOTE]
> A Chrome Web Store release is planned once packaging and review are complete.
> Until then, eLeetCode can be installed locally from a release package or manual
> build.

### Download Latest Release

1. Download the latest release package from the releases page.
2. Unzip the downloaded file.
3. Open `chrome://extensions`.
4. Enable **Developer mode**.
5. Click **Load unpacked**.
6. Select the unzipped extension folder.
7. Open any LeetCode problem page.

### Manual Setup

Clone the repository and install dependencies:

```sh
git clone https://github.com/notAkki/eLeetCode.git
cd eLeetCode
npm install
```

Build the extension:

```sh
npm run build
```

Load it in Chrome:

1. Open `chrome://extensions`.
2. Enable **Developer mode**.
3. Click **Load unpacked**.
4. Select the generated `dist` folder.
5. Open any LeetCode problem page.

## GitHub Configuration

Open the dashboard, click the settings icon, and configure:

| Field               | Description                                            |
| ------------------- | ------------------------------------------------------ |
| GitHub token        | Token with read/write access to repository contents    |
| Owner               | GitHub username or organization                        |
| Repository          | Repository used for tracker storage                    |
| Branch              | Branch to read from and write to                       |
| Tracker path        | JSON tracker file path, usually `tracker.json`         |
| Solutions directory | Directory for saved solution code, usually `solutions` |

Settings are stored locally in Chrome extension storage.

## Tracker Format

The tracker file is a JSON document keyed by LeetCode problem slug:

> [!NOTE]
> If you already have practice notes elsewhere, you can use a small script or an
> LLM-assisted conversion pass to seed this tracker file from your existing
> records.

```json
{
  "problems": {
    "two-sum": {
      "slug": "two-sum",
      "title": "Two Sum",
      "leetcodeDifficulty": "Easy",
      "personalDifficulty": "Easy",
      "tags": ["Array", "Hash Map"],
      "reviewFlag": "redo",
      "firstAttemptedAt": "2026-06-23T15:56:52.205Z",
      "lastAttemptedAt": "2026-06-23T15:56:52.205Z",
      "attempts": [
        {
          "solvedAt": "2026-06-23T15:56:52.205Z",
          "language": "Python3",
          "outcome": "independent",
          "duration": 600,
          "codePath": "solutions/two-sum/2026-06-23T15-56-52-205Z.py",
          "notes": "Used a hash map for one-pass lookup."
        }
      ]
    }
  }
}
```

## Troubleshooting

- If the UI does not update after code changes, rebuild the extension and reload it from `chrome://extensions`.
- If saving fails, verify your GitHub token, owner, repository, branch, tracker path, and solutions directory.
- If extracted LeetCode fields look wrong, LeetCode may have changed its markup. The extraction logic lives in `src/features/leetcode/extractContext.ts`.

## Contributing

Contributions are welcome. Please keep changes focused, run the validation commands, and include a short explanation + screenshots for user-facing behavior changes.

```sh
npm run typecheck
npm run build
```
