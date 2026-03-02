cask "handless" do
  version "0.1.0"

  on_arm do
    url "https://github.com/ElwinLiu/handless/releases/download/v#{version}/Handless_#{version}_aarch64.dmg"
    sha256 "PLACEHOLDER_ARM64_SHA256"
  end

  on_intel do
    url "https://github.com/ElwinLiu/handless/releases/download/v#{version}/Handless_#{version}_x86_64.dmg"
    sha256 "PLACEHOLDER_X86_64_SHA256"
  end

  name "Handless"
  desc "Cross-platform desktop speech-to-text app"
  homepage "https://github.com/ElwinLiu/handless"

  app "Handless.app"

  zap trash: [
    "~/Library/Application Support/com.handless.app",
    "~/Library/Caches/com.handless.app",
    "~/Library/Preferences/com.handless.app.plist",
    "~/Library/Saved Application State/com.handless.app.savedState",
    "~/Library/Logs/com.handless.app",
  ]
end
