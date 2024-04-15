var minimist = require('minimist')
var _targets = require('node-abi').supportedTargets
var detectLibc = require('detect-libc')
var napi = require('napi-build-utils')

var libc = process.env.LIBC || (detectLibc.isNonGlibcLinuxSync() && detectLibc.familySync()) || ''

var rc = require('rc')('prebuild', {
  target: process.versions.node,
  runtime: 'node',
  arch: process.arch,
  libc: libc,
  platform: process.platform,
  all: false,
  force: false,
  debug: false,
  verbose: false,
  path: '.',
  backend: 'node-gyp',
  format: false,
  'include-regex': '\\.node$',
  'tag-prefix': 'v',
  prerelease: false,
  exclude: [
    { runtime: 'node', target: '17'},
    { runtime: 'node', target: '13'},
    { runtime: 'node', target: '8'},
  ],
}, minimist(process.argv, {
  alias: {
    target: 't',
    runtime: 'r',
    help: 'h',
    arch: 'a',
    path: 'p',
    force: 'f',
    version: 'v',
    upload: 'u',
    preinstall: 'i',
    prepack: 'c'
  },
  string: [
    'target'
  ]
}))

var targets = _targets.filter(function (target) {
  return !rc.exclude.some(function (excludeTarget) {
    return target.target.startsWith(excludeTarget.target)
  })
});

if (rc.path === true) {
  delete rc.path
}

if (napi.isNapiRuntime(rc.runtime) && rc.target === process.versions.node) {
  if (rc.all === true) {
    rc.target = napi.getNapiBuildVersions()
  } else {
    rc.target = napi.getBestNapiBuildVersion()
  }
}

if (rc.target) {
  var arr = [].concat(rc.target)
  rc.prebuild = []
  for (var k = 0, len = arr.length; k < len; k++) {
    if (!napi.isNapiRuntime(rc.runtime) || napi.isSupportedVersion(arr[k])) {
      rc.prebuild.push({
        runtime: rc.runtime,
        target: arr[k]
      })
    }
  }
}

function filterTargets(targets, excludeVersions) {
  return targets.filter(target => {
    const { runtime, target: version } = target;
    return !excludeVersions.some(excludeVersion => {
      if (typeof excludeVersion === 'string') {
        return version.startsWith(excludeVersion);
      } else if (excludeVersion instanceof RegExp) {
        return excludeVersion.test(version);
      }
      return false;
    });
  });
}

if (rc.all === true && !napi.isNapiRuntime(rc.runtime)) {
  delete rc.prebuild
  rc.prebuild = filterTargets(targets, rc.exclude)
}

if (rc['upload-all']) {
  rc.upload = rc['upload-all']
}

rc['include-regex'] = new RegExp(rc['include-regex'], 'i')

module.exports = rc

if (!module.parent) {
  console.log(JSON.stringify(module.exports, null, 2))
}
