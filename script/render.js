var fs = require('fs');
var glob = require('glob');
var path = require('path');
var mkdirp = require('mkdirp');
require('babel-register'); // Is this still needed?

var marked = require('marked');
var yaml = require('js-yaml');
var React = require('react');
var ReactDOM = require('react-dom');
var ReactDOMServer = require('react-dom/server');

var util = require('./util.js');

var options = {
  src: 'build/content.json',
  dest: 'build/',
  includeFilename: true,
  bodyProperty: 'body',
  compileMarkdown: true,
  templatesDir: 'src/templates',
  mainComponent: 'Main.jsx',
  wrapperFile: 'wrapper.html',
  wrapperInsertionPoint: '<!-- APP_CONTENT_HERE -->',
  useWrapper: true,
};

// Require config.
var pathMap = require('./config.js').pathMap;

// Get wrapper if config.useWrapper is true.
var wrapper = '';
if (options.useWrapper) {
  wrapper = fs.readFileSync(path.join(options.templatesDir, options.wrapperFile)).toString();
}

// marked.setOptions({
//   renderer: new marked.Renderer(),
//   gfm: true,
//   tables: true,
//   breaks: true,
//   pedantic: false,
//   sanitize: true,
//   smartLists: true,
//   smartypants: false,
//   highlight: function(code) {
//     return require('highlight.js').highlightAuto(code).value;
//   }
// });
//
var hasOwnProperty = Object.prototype.hasOwnProperty;

function extend() {
  var target = {};

  for (var i = 0; i < arguments.length; i++) {
    var source = arguments[i];
    for (var key in source) {
      if (hasOwnProperty.call(source, key)) {
        target[key] = source[key];
      }
    }
  }
  return target;
}

function processJSON(json) {
  if (pathMap) {
    json = extend(json, pathMap[json.filename]);
  }

  if (json.component) {
    // Get the Component and render the HTML to wrap it.
    var mainFile = path.resolve(path.join(options.templatesDir, options.mainComponent));
    var MainComponent = require(mainFile);
    var componentHTML = ReactDOMServer.renderToString(React.createElement(MainComponent, extend({}, {
      json: json
    })));
    var html = wrapper.split(options.wrapperInsertionPoint).join(componentHTML);
    console.log('Building: ', json.title || json.filename);
    // Write Files
    var filePath = path.join(options.dest, json.path);
    util.writeFile(filePath, html);
  } else {
    return new Error ('No "component" property passed in for: ' + json.filename);
  }
}

function parseArguments(argv) {
  var args = argv.slice(2);
  var indexes = {};

  // Get from stdin.
  process.stdin.setEncoding('utf8');

  process.stdin.on('readable', function() {
    var chunk = process.stdin.read();
    if (chunk !== null) {
      var json;
      try {
        json = JSON.parse(chunk);
        processJSON(json);
      } catch (e) {
        console.log('Multiple files were chunked together.')
        try {
          var array = '[' + chunk.split('}{').join('},{') + ']';
          json = JSON.parse(array);
          json.forEach(function(item) {
            processJSON(item);
          })
        } catch (e) {}
      }
    }
  });
  process.stdin.on('end', function() {
    // process.stdout.write('end');
  });

  // Parse options.
  indexes.src = args.indexOf('--src');
  if (indexes.src !== -1) {
    options.src = args[indexes.src + 1];
  }

  var globOptions = {
    ignore: ['node_modules/**'] // ignore node_modules by default
  };


  // glob(options.src, globOptions, function(error, files) {
  //   files.forEach(function(filename) {
  //     fs.readFile(filename, 'utf8', function(err, data) {
  //       // parseFile({
  //       //   data: data,
  //       //   filename: filename
  //       // });
  //     });
  //   });
  // });
}

parseArguments(process.argv);
