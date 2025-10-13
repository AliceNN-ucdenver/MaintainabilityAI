# Changelog

## 2025-10-13 - Production Ready Release (v1.1)

### Improved

#### 5. Claude Workflow Optimization ✨
**Enhancement**: Better handling of approval workflow to avoid redundant plan regeneration

**Changes**:
- Added `track_progress: true` to enable progress tracking comments
- Updated prompt with explicit approval detection logic
- Claude now checks for previous remediation plan before re-analyzing
- If approval found, skips directly to implementation (no plan repost)

**Benefits**:
- ✅ Faster approval-to-implementation workflow
- ✅ No duplicate remediation plans
- ✅ Clearer intent in workflow runs
- ✅ Better use of API credits

**File**: `.github/workflows/claude-remediation.yml`

---

## 2025-10-13 - Production Ready Release (v1.0)

All critical issues identified during testing have been resolved. System is production-ready.

### Fixed Issues

#### 1. GitHub Issue Body Size Limit ✅
**Problem**: Issues failing with "body is too long (maximum is 65536 characters)"

**Solution**:
- Wrapped all prompts in collapsible `<details>` tags
- Intelligent truncation: OWASP (40KB), Maintainability (10KB), Threat Model (10KB)
- Final safety check at 65,000 characters
- Shows prompt sizes for transparency

**File**: `automation/process-codeql-results.js`

---

#### 2. SARIF File Extraction ✅
**Problem**: Workflow failing because CodeQL creates `javascript.sarif` (language-specific)

**Solution**:
- Automatically finds and renames any `*.sarif` file to `codeql-results.sarif`
- Works with all languages (JavaScript, TypeScript, Python, Go, etc.)

**File**: `.github/workflows/codeql-to-issues.yml`

---

#### 3. Missing CodeQL Rule Mappings ✅
**Problem**: 3 rules skipped with "no OWASP mapping" warning

**Solution**: Added mappings for:
- `js/request-forgery` → A01 Broken Access Control
- `js/http-to-file-access` → A01 Broken Access Control
- `js/file-access-to-http` → A05 Security Misconfiguration

**Total rules mapped**: 32 (was 29)

**File**: `automation/prompt-mappings.json`

---

#### 4. Claude Code Action Authentication ✅
**Problem**: Action failing with "Claude Code is not installed on this repository"

**Solution**: Added `github_token: ${{ secrets.GITHUB_TOKEN }}` parameter

**File**: `.github/workflows/claude-remediation.yml`

---

## Testing Status

✅ **Issue Creation**: Tested with 12 findings, all processed successfully
✅ **SARIF Extraction**: Works with `javascript.sarif`
✅ **Prompt Embedding**: All prompts collapsible, no size errors
✅ **Rule Coverage**: All detected vulnerabilities mapped
✅ **Claude AI**: Authentication working, approval workflow optimized

---

## Deployment

Use `deploy-test.sh` for fresh deployment. All fixes included automatically.

```bash
./deploy-test.sh
```

---

## Credits

**Built with**:
- [CodeQL](https://codeql.github.com) - Semantic code analysis
- [Claude AI](https://anthropic.com/claude) - AI-assisted remediation
- [MaintainabilityAI](https://maintainability.ai) - OWASP security prompts
- [claude-code-action](https://github.com/anthropics/claude-code-action) - GitHub integration

🤖 **AI-assisted development** using Claude Code following MaintainabilityAI's "Golden Rules of Vibe Coding"
