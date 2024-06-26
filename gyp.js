var assert = require('assert')
var path = require('path')
var os = require('os')

var backends = {
  'node-gyp': require('@ingstory/node-gyp')(),
  'node-ninja': require('node-ninja')(),
  'nw-gyp': require('nw-gyp')()
}

// Use system installed node-gyp for other JS engines
var jsEngine = process.jsEngine || 'v8'
if (jsEngine !== 'v8') {
  backends['node-gyp'] = require(path.join(
    path.dirname(process.execPath), 'node_modules/npm/node_modules/@ingstory/node-gyp'))()
}

function runGyp (opts, cb) {
  var backend = opts.backend || 'node-gyp'
  var gyp = opts.gyp || backends[backend]
  assert(gyp, 'missing backend')
  var log = opts.log
  var args = opts.args
  assert(Array.isArray(args), 'args must be an array')

  log.verbose('execute ' + backend + ' with `' + args.join(' ') + '`')
  gyp.parseArgv(args)
  gyp.devDir = devDir(opts.runtime || 'node')

  function runStep () {
    var command = gyp.todo.shift()
    if (!command) {
      return cb()
    }

    if (opts.filter) {
      if (opts.filter(command)) {
        process.nextTick(runStep)
        return
      }
    }

    gyp.commands[command.name](command.args).then(function () {
      log.verbose('ok')
      process.nextTick(runStep)
    }, function (err) {
      log.error(command.name + ' error')
      log.error('stack', err.stack)
      log.error('not ok')
      return cb(err)
    })
  }

  if (gyp.todo.length > 0) {
    runStep()
  } else {
    log.verbose('no gyp tasks needed')
    cb()
  }
}

function devDir (runtime) {
  // Since electron and node are reusing the versions now (fx 6.0.0) and
  // node-gyp only uses the version to store the dev files, they have started
  // clashing. To work around this we explicitly set devdir to tmpdir/runtime(/target)
  return path.join(os.tmpdir(), 'prebuild', runtime)
}

module.exports = runGyp
