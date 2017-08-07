const fs   = require('fs')
const path = require('path')
const vm   = require('vm')

const toml = require('toml')

let build = {}

// get site.toml configuration file
build.getConf = (callback) => {
  console.log('Reading site.toml')
  fs.readFile(buildpath, 'utf8', (readConfError, data) => {
    if (readConfError) throw readConfError
    callback(toml.parse(data))
  })
}
// get toml files for pages
build.getPages = (callback) => {
  // locating pages
  let contentpath = path.join(path.dirname(buildpath), '/content/')
  console.log('Indexing pages')
  fs.readdir(contentpath, (pageTomlFindError, filenames) => {
    // no non-toml files ok
    let files = filenames.filter(item => {
      return item.indexOf('.toml') !== -1
    })
    // parse all page tomls
    console.log('Parsing pages')
    files.forEach((filename, index) => {
      try {
        files[index] = toml.parse(fs.readFileSync(path.join(contentpath, filename), 'utf8'))
      } catch (e) {
        let parseError = e.message.slice(0, e.message.lastIndexOf('.')) +
        ' at line ' + e.line + ', column ' + e.column +
        ' in content/' + filename + '.'
        throw parseError
      }
      files[index].filename = filename.replace('.toml', '')
    })
    callback(files)
  })
}

build.prepBinFolder = () => {
  let binfolder = path.join(path.dirname(buildpath), '/bin/')

  try {
    console.log('Attempting to clean bin folder')
    build.cleanBuildFolder(binfolder)
  } finally {
    fs.mkdirSync(binfolder)
  }
}

build.cleanBuildFolder = binfolder => {
  build.delete(binfolder)
}

build.delete = pathname => {
  try {
    if(fs.statSync(pathname).isDirectory()) {
      let contents = fs.readdirSync(pathname)
      contents.forEach(filename => {
        build.delete(path.join(pathname, filename))
      })
      fs.rmdirSync(pathname)
    } else {
      fs.unlinkSync(pathname)
    }
  } catch (e) {}
}

build.buildPage = (page, site, allpages) => {
  console.log('Building page ' + page.filename + '.toml')
  // create context for hatch stuff
  let ctx = vm.createContext({
      require: require,
      page: page,
      site: site,
      allpages: allpages,
      returnval: ''
  })

  build.getTemplate(page.template, data => {
    // hehe yay hax
    const templatepage = data.replace(/<%>(.|\s)*?<\/%>/g, tag => {
      vm.runInContext(
        'returnval=function(){' +
        tag.replace('<%>', '').replace('</%>', '') +
        '}()',
        ctx,
        {
          filename: page.template.replace('.toml', '') + '.toml',
          displayErrors: false
        }
      )
      return ctx.returnval
    })
    const filename = path.join(path.dirname(buildpath), '/bin/', page.filename + '.html')
    fs.writeFileSync(filename, templatepage, () => {})
  })
}

build.getTemplate = (name, callback) => {
  let templatepath = path.join(path.dirname(buildpath), '/theme/', name.replace('.hatch', '') + '.hatch')
  console.log('loading template ' + templatepath)
  fs.readFile(templatepath, 'utf8', (readTemplateErr, data) => {
    if(readTemplateErr) throw readTemplateErr
    callback(data)
  })
}

build.build = yargs => {
  global.buildpath = yargs.s
  // make buildpath a path to site.toml just in case it's not
  if(buildpath.indexOf('site.toml') === -1) {
    buildpath = path.join(buildpath, '/site.toml')
  }

  build.getConf(conf => {
    build.getPages(files => {
      build.prepBinFolder()
      files.forEach(file => {
        build.buildPage(file, conf, files)
      })
    })
  })
}

module.exports = build;
