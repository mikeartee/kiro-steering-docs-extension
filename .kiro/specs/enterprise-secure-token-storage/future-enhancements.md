# Future Security Enhancements (Internal Planning)

> **Note:** This document is for internal planning only and should not be committed to the public repository. These features are candidates for future versions after the core SecretStorage migration is complete.

## Overview

This document captures additional enterprise security features that were identified during requirements gathering but deferred from the initial implementation to keep scope manageable.

## Enhancement 1: Token Expiry Warnings

### Problem

Fine-grained Personal Access Tokens (PATs) have configurable expiration dates. Users may not realize their token has expired until they encounter authentication failures.

### Proposed Solution

- Parse token metadata to detect expiry date (if available via GitHub API)
- Display warning notification 7 days before expiry
- Show expiry status in "Check Token Status" command output
- Add optional setting to configure warning threshold

### Technical Considerations

- GitHub API endpoint: `GET /user` returns token metadata
- Fine-grained PATs include expiry in response headers
- Classic PATs don't have expiry dates
- Need to cache expiry check to avoid excessive API calls

### Priority

Medium - Improves UX but not critical for security

## Enhancement 2: Multi-Repository Token Support

### Problem

Some enterprises have multiple private repositories with different access requirements. A single token may not have access to all repos, or security policies may require separate tokens per repo.

### Proposed Solution

- Allow configuring tokens per repository URL pattern
- Token selection based on repository being accessed
- UI to manage multiple tokens
- Fallback chain: repo-specific → default → anonymous

### Technical Considerations

- SecretStorage key scheme: `steeringDocs.token.{repoPattern}`
- Need UI for managing multiple tokens
- Complexity in GitHubClient to select correct token
- Migration path from single-token to multi-token

### Priority

Low - Edge case for most users, significant complexity

## Enhancement 3: Proxy and Corporate Firewall Support

### Problem

Enterprise networks often require HTTP/HTTPS proxy configuration to access external services like GitHub. The extension currently uses Node.js https module directly without proxy support.

### Proposed Solution

- Read the IDE's proxy settings (`http.proxy`, `http.proxyStrictSSL`)
- Support environment variables (`HTTP_PROXY`, `HTTPS_PROXY`, `NO_PROXY`)
- Add extension-specific proxy override setting
- Support proxy authentication

### Technical Considerations

- Use `https-proxy-agent` or similar library
- Handle proxy authentication securely (don't log credentials)
- Test with common enterprise proxies (Zscaler, BlueCoat, etc.)
- Certificate handling for SSL inspection proxies

### Priority

High for enterprise adoption - Many corporate networks require this

## Enhancement 4: Token Scope Validation

### Problem

Users may provide tokens with insufficient scopes for their use case (e.g., no `repo` scope for private repositories). This results in confusing 404 errors instead of clear permission errors.

### Proposed Solution

- Query GitHub API to get token scopes on validation
- Warn if token lacks `repo` scope when private repo is configured
- Display current scopes in "Check Token Status" output
- Suggest minimum required scopes based on configuration

### Technical Considerations

- GitHub returns scopes in `X-OAuth-Scopes` response header
- Fine-grained PATs use different permission model
- Need to handle both classic and fine-grained PATs
- Don't block storage, just warn

### Priority

Medium - Improves UX and reduces support burden

## Enhancement 5: Session Timeout (Auto-Lock)

### Problem

In high-security environments, credentials should not persist indefinitely in memory. If a user walks away from their workstation, the token remains accessible.

### Proposed Solution

- Optional setting to clear in-memory token after inactivity period
- Require re-authentication after timeout
- Integrate with Kiro IDE's trusted workspace feature
- Option to require token re-entry on each IDE session

### Technical Considerations

- Track last API call timestamp
- Clear token from GitHubClient on timeout
- Don't delete from SecretStorage, just clear memory
- Balance security vs. UX (frequent re-auth is annoying)

### Priority

Low - Most enterprises rely on OS-level screen lock

## Enhancement 6: Telemetry Transparency

### Problem

Enterprise security teams want assurance that sensitive operations (token storage, API calls) are not being telemetered to third parties.

### Proposed Solution

- Document exactly what telemetry is collected (currently: none)
- Add explicit "no telemetry" statement to README
- Respect VS Code's telemetry settings
- Audit logging is local-only, never transmitted

### Technical Considerations

- The IDE's telemetry API is opt-in
- Extension currently collects no telemetry
- Document this clearly for enterprise procurement

### Priority

Low - Documentation task, no code changes needed

## Enhancement 7: Certificate Pinning

### Problem

In extremely high-security environments, there's concern about man-in-the-middle attacks even with HTTPS. Certificate pinning ensures only GitHub's legitimate certificates are accepted.

### Proposed Solution

- Pin GitHub's root CA certificates
- Fail requests if certificate chain doesn't match
- Allow disabling for corporate SSL inspection proxies
- Log certificate validation failures

### Technical Considerations

- GitHub's certificates rotate periodically
- Corporate proxies often use SSL inspection (breaks pinning)
- Significant maintenance burden to keep pins updated
- May conflict with Enhancement 3 (proxy support)

### Priority

Very Low - Overkill for most use cases, conflicts with proxy support

## Implementation Roadmap

### Phase 1 (Current): Core SecretStorage Migration

- SecretStorage API integration
- Token management commands
- Audit logging
- Deprecation of plaintext setting

### Phase 2: Enterprise Essentials

- Proxy support (Enhancement 3)
- Token scope validation (Enhancement 4)

### Phase 3: Advanced Features

- Token expiry warnings (Enhancement 1)
- Telemetry documentation (Enhancement 6)

### Phase 4: Edge Cases (If Requested)

- Multi-repository tokens (Enhancement 2)
- Session timeout (Enhancement 5)
- Certificate pinning (Enhancement 7)

## Notes

- Prioritization based on enterprise customer feedback
- Phase 2 should be considered for v1.1 release
- Phase 3-4 only if specific customer requests
