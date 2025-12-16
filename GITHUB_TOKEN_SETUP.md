# GitHub Token Setup

## Why Use a GitHub Token?

GitHub API has rate limits:
- **Without token**: 60 requests/hour
- **With token**: 5,000 requests/hour

If you're actively browsing and installing steering documents, you'll hit the limit quickly. Adding a token solves this.

## Setup Steps

### 1. Generate a GitHub Token

1. Go to https://github.com/settings/tokens
2. Click "Generate new token (classic)"
3. Give it a name like "Kiro Steering Docs"
4. Select scopes:
   - For public repos only: Leave all scopes unchecked (read-only access is default)
   - For private repos: Check `repo` scope
5. Click "Generate token"
6. **Copy the token immediately** (you won't see it again)

### 2. Add Token to VS Code Settings

Open your VS Code settings (JSON) and add:

```json
{
  "steeringDocs.githubToken": "ghp_your_token_here"
}
```

Or use the Settings UI:
1. Open Settings (Ctrl+,)
2. Search for "steering docs github"
3. Paste your token in the "Github Token" field

### 3. Reload VS Code

Press `Ctrl+Shift+P` and run "Developer: Reload Window" or just restart VS Code.

## Verify It's Working

After adding the token, you should be able to:
- Browse documents without hitting rate limits
- Use the recommendation feature multiple times
- Install multiple documents in quick succession

## Security Notes

- The token is stored in your VS Code settings
- Never commit your token to git
- If you accidentally expose it, revoke it immediately at https://github.com/settings/tokens
- The extension only uses the token for read access to public repositories

## Troubleshooting

**Still getting rate limit errors?**
- Make sure you reloaded VS Code after adding the token
- Check that the token is valid at https://github.com/settings/tokens
- Verify the token has the correct permissions

**Token not working?**
- Ensure there are no extra spaces in the token string
- Try regenerating the token
- Check VS Code's Output panel for error messages

