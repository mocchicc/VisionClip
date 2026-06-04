# Changelog

All notable changes to VisionClip are documented here.

## 0.1.0 - 2026-06-03

Initial public MVP release.

### Added

- Chrome MV3 extension for image OCR from the right-click context menu.
- Region OCR from the extension popup, page context menu, and `Option+Shift+O` / `Alt+Shift+O` shortcut.
- macOS Native Messaging host written in Swift.
- OpenAI Responses API integration for OCR.
- macOS Keychain storage for each user's OpenAI API key.
- Automatic copy of OCR results to the macOS clipboard.
- Popup status view with selected model, current run state, token usage, and recent OCR history.
- OCR history controls, including clear history and opt-out for new history saves.
- Model selection for `gpt-4.1-mini`, `gpt-5.4-nano`, and `gpt-5.4-mini`.
- Modal-friendly region OCR flow using a captured screenshot overlay.
- Sample OCR fixture page and generated sample images under `samples/`.
- Extension icon assets, social announcement images, and Chrome Web Store promotional image candidate.
- Release packaging scripts for extension zip, macOS native host zip, and system-wide macOS native host pkg artifacts.
- Release artifact verification, native messaging smoke tests, pkg allowed-origin checks, installer smoke tests, release preflight, release QA report generation, and version consistency checks.
- Public project docs: README, privacy notice, permissions rationale, support, security, contributing, store listing draft, macOS distribution notes, and announcement drafts.

### Security and Privacy

- API keys are saved in macOS Keychain and are not stored in Chrome extension local storage.
- OCR images or selected screenshots are sent only when the user explicitly starts OCR.
- The extension no longer requests `<all_urls>` host permissions or persistent content scripts.
- OCR history is limited to recent local previews and can be cleared or disabled.

### Known Limitations

- Distribution is still manual through GitHub and `Load unpacked`; Chrome Web Store distribution is not complete.
- The macOS native host pkg can be generated, but it is not yet shipped as a Developer ID signed/notarized installer.
- Users need their own OpenAI API key.
- Web pages with strict image loading behavior, login-only content, or dynamic modals may still need range OCR instead of direct image OCR.
