const Module = require('module')
    , jspm   = require('jspm')
    , path   = require('path')
    , url    = require('url')
    , load   = Module._load

// NOTE(jordan): Robust pjson directory lookup.
const pjsonLoc = require('find-pkg').sync(process.cwd())
    , pjsonDir = path.parse(pjsonLoc).dir

jspm.setPackagePath(pjsonDir)

const System = jspm.Loader()

// NOTE(jordan): Resolve local project imports correctly.
function moduleIsInSystemPaths (name) {
  let systemPath = path.parse(name).dir + '/'

  systemPath = systemPath.split('/')[0]

  return systemPath + '/' in System.paths
}

// NOTE(jordan): Shim Module._load to check jspm_packages.
Module._load = (name, m) => {
  // Is the module "special"? (Cannot be looked up in filesystem)
  // Needed this to fix the errors caused by SpecialSystemModules like @system-env
  if (name in System._loader.modules) {
    return System._loader.modules[name].module
  }

  // Is the module a JSPM dependency?
  if (name in System.map || moduleIsInSystemPaths(name)) {
    let jspmUri  = System.normalizeSync(name)
    name = url.parse(jspmUri).path
  }

  // Try first to load a JSPM dep, then try local project, then try NPM.
  return load(name, m)
}
