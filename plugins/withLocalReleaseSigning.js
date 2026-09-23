const { withAppBuildGradle } = require('expo/config-plugins');

// The native project is generated and ignored. Keep only the wiring here;
// the local keystore and passwords are read by Gradle from the environment.
module.exports = function withLocalReleaseSigning(config) {
  return withAppBuildGradle(config, gradle => {
    let source = gradle.modResults.contents;
    if (source.includes('WR_RELEASE_STORE_FILE')) return gradle;
    const buildTypes = source.indexOf('    buildTypes {');
    if (buildTypes < 0) throw new Error('Android buildTypes block not found for release signing');
    const release = source.indexOf('        release {', buildTypes);
    if (release < 0) throw new Error('Android release build type not found');
    const debugSign = source.indexOf('signingConfig signingConfigs.debug', release);
    if (debugSign < 0) throw new Error('Expected Expo release signing line not found');

    source = source.slice(0, buildTypes) + `    signingConfigs {
        localRelease {
            def path = System.getenv('WR_RELEASE_STORE_FILE')
            if (path) {
                storeFile file(path)
                storePassword System.getenv('WR_RELEASE_STORE_PASSWORD')
                keyAlias System.getenv('WR_RELEASE_KEY_ALIAS')
                keyPassword System.getenv('WR_RELEASE_KEY_PASSWORD')
            }
        }
    }
` + source.slice(buildTypes);
    const releaseAgain = source.indexOf('        release {', source.indexOf('    buildTypes {'));
    const debugSignAgain = source.indexOf('signingConfig signingConfigs.debug', releaseAgain);
    source = source.slice(0, debugSignAgain) + `signingConfig signingConfigs.debug
            if (System.getenv('WR_RELEASE_STORE_FILE')) {
                signingConfig signingConfigs.localRelease
            }` + source.slice(debugSignAgain + 'signingConfig signingConfigs.debug'.length);
    gradle.modResults.contents = source;
    return gradle;
  });
};
