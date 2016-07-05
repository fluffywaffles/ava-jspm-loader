const Module = require('module')
    , jspm   = require('jspm')
    , path   = require('path')
    , url    = require('url')
    , load   = Module._load

function debug () {
  if (process.env.AVA_JSPM_LOADER_DEBUG)
    console.log.apply(console, arguments)
}

// NOTE(jordan): Robust pjson directory lookup.
const pjsonLoc = require('find-pkg').sync(process.cwd())
    , pjsonDir = path.parse(pjsonLoc).dir
    , pjson    = require(pjsonLoc)

// DEBUG
debug(`[loader:internal] package.json location: ${pjsonLoc}`)

// NOTE(jordan): Set up JSPM.
jspm.setPackagePath(pjsonDir)

// NOTE(jordan): Get the JSPM Loader.
const System = jspm.Loader()

// NOTE(jordan): Configure the loader to always look for JS files by default.
System.config({
  packages: {
    [pjson.jspm.name]: {
      defaultExtension: "js"
    }
  }
})

// NOTE(jordan): Resolve local project imports correctly.
function jspmHasModule (name) {
  // Short circuit if it's a relative path OR an absolute path.
  if (/^(\.\/|\.\.\/|\/)/.test(name)) {
    return false
  }

  const possiblePaths = [ name ]
  let i = -1

  while (~(i = name.lastIndexOf('/'))) {
    name = name.substr(0, i)
    possiblePaths.push(name + '/')
  }

  debug(`[loader:internal] possible paths: ${possiblePaths}`)

  return possiblePaths.some(function (p) {
    return p in System.paths || p in System.map
  })
}

// NOTE(jordan): Shim Module._load to check jspm_packages.
Module._load = (name, m) => {
  // Is the module "special"? (Cannot be looked up in filesystem)
  // Needed this to fix the errors caused by SpecialSystemModules like @system-env
  debug(`[loader:internal] ${name} in System._loader.modules: ${name in System._loader.modules}`)
  if (name in System._loader.modules) {
    return System._loader.modules[name].module
  }

  // Is the module a JSPM dependency?
  debug(`[loader:internal] jspmHasModule(${name}): ${jspmHasModule(name)}`)
  if ( jspmHasModule(name) ) {
    let jspmUri  = System.normalizeSync(name)
    debug(`[loader:internal] successfully normalized: ${jspmUri}`)
    name = url.parse(jspmUri).path
    debug(`[loader:internal] parsed module path: ${name}`)
  }

  // Try first to load a JSPM dep, then try local project, then try NPM.
  return load(name, m)
}
