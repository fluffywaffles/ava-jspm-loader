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

// NOTE(jordan): Shim Module._load to check jspm_packages.
Module._load = (name, m) => {
  try {
    return load(name, m)
  } catch (e) {
    // Is the module "special"? (Cannot be looked up in filesystem)
    // Needed this to fix the errors caused by SpecialSystemModules like @system-env
    if (name in System._loader.modules) {
      return System._loader.modules[name].module
    }

    // Module must be a JSPM dependency
    let jspmUri  = System.normalizeSync(name)
    name = url.parse(jspmUri).path
    return load(name, m)
  }
}
