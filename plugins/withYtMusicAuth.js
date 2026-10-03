const { withMainApplication, withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

/**
 * Expo Config Plugin to inject YtMusicAuth native module into the Android build.
 *
 * Copies YtMusicAuthModule.kt and YtMusicAuthPackage.kt into android/app/src/main/java/com/oto/music/auth/
 * and registers YtMusicAuthPackage in MainApplication.kt so that NativeModules.YtMusicAuthModule
 * is always available on Android builds generated locally or on CI/GitHub Actions.
 */
const withYtMusicAuth = (config) => {
  // 1. Copy Kotlin files into the Android project
  config = withDangerousMod(config, [
    'android',
    async (config) => {
      const projectRoot = config.modRequest.projectRoot;
      const targetDir = path.join(
        projectRoot,
        'android/app/src/main/java/com/oto/music/auth'
      );
      fs.mkdirSync(targetDir, { recursive: true });

      const sourceDir = path.join(projectRoot, 'src/auth/native/android');
      for (const file of ['YtMusicAuthModule.kt', 'YtMusicAuthPackage.kt']) {
        const src = path.join(sourceDir, file);
        const dest = path.join(targetDir, file);
        if (fs.existsSync(src)) {
          fs.copyFileSync(src, dest);
        }
      }
      return config;
    },
  ]);

  // 2. Patch MainApplication.kt to register YtMusicAuthPackage
  config = withMainApplication(config, (config) => {
    let contents = config.modResults.contents;

    // Add import statement if missing
    if (!contents.includes('import com.oto.music.auth.YtMusicAuthPackage')) {
      contents = contents.replace(
        'package com.oto.music',
        'package com.oto.music\n\nimport com.oto.music.auth.YtMusicAuthPackage'
      );
    }

    // Register in packageList if missing
    if (!contents.includes('add(YtMusicAuthPackage())')) {
      if (contents.includes('PackageList(this).packages.apply {')) {
        contents = contents.replace(
          'PackageList(this).packages.apply {',
          'PackageList(this).packages.apply {\n          add(YtMusicAuthPackage())'
        );
      } else if (contents.includes('PackageList(this).packages')) {
        contents = contents.replace(
          'PackageList(this).packages',
          'PackageList(this).packages.apply {\n          add(YtMusicAuthPackage())\n        }'
        );
      }
    }

    config.modResults.contents = contents;
    return config;
  });

  return config;
};

module.exports = withYtMusicAuth;
