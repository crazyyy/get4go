// Avoid `console` errors in browsers that lack a console.
(function() {
  var method;
  var noop = function() {};
  var methods = ['assert', 'clear', 'count', 'debug', 'dir', 'dirxml', 'error', 'exception', 'group', 'groupCollapsed', 'groupEnd', 'info', 'log', 'markTimeline', 'profile', 'profileEnd', 'table', 'time', 'timeEnd', 'timeline', 'timelineEnd', 'timeStamp', 'trace', 'warn'];
  var length = methods.length;
  var console = (window.console = window.console || {});

  while (length--) {
    method = methods[length];

    // Only stub undefined methods.
    if (!console[method]) {
      console[method] = noop;
    }
  }
}());
if (typeof jQuery === 'undefined') {
  console.warn('jQuery hasn\'t loaded');
} else {
  console.log('jQuery has loaded');
}
// Place any jQuery/helper plugins in here.
// circles.js
// circles
// copyright Artan Sinani
// https://github.com/lugolabs/circles

/*
  Lightwheight JavaScript library that generates circular graphs in SVG.

  Call Circles.create(options) with the following options:

    id         - the DOM element that will hold the graph
    radius     - the radius of the circles
    width      - the width of the ring (optional, has value 10, if not specified)
    value      - init value of the circle (optional, defaults to 0)
    maxValue   - maximum value of the circle (optional, defaults to 100)
    text       - the text to display at the centre of the graph (optional, the current "htmlified" value will be shown if not specified)
                 if `null` or an empty string, no text will be displayed
                 can also be a function: the returned value will be the displayed text
                     ex1. function(currentValue) {
                              return '$'+currentValue;
                          }
                     ex2.  function() {
                               return this.getPercent() + '%';
                           }
    colors     - an array of colors, with the first item coloring the full circle
                 (optional, it will be `['#EEE', '#F00']` if not specified)
    duration   - value in ms of animation duration; (optional, defaults to 500);
                 if 0 or `null` is passed, the animation will not run
    wrpClass     - class name to apply on the generated element wrapping the whole circle.
    textClass:   - class name to apply on the generated element wrapping the text content.

    API:
      updateRadius(radius) - regenerates the circle with the given radius (see spec/responsive.html for an example hot to create a responsive circle)
      updateWidth(width) - regenerates the circle with the given stroke width
      updateColors(colors) - change colors used to draw the circle
      update(value, duration) - update value of circle. If value is set to true, force the update of displaying
      getPercent() - returns the percentage value of the circle, based on its current value and its max value
      getValue() - returns the value of the circle
      getMaxValue() - returns the max value of the circle
       getValueFromPercent(percentage) - returns the corresponding value of the circle based on its max value and given percentage
       htmlifyNumber(number, integerPartClass, decimalPartClass) - returned HTML representation of given number with given classes names applied on tags

*/

(function(root, factory) {
  if (typeof exports === 'object') {
    module.exports = factory();
  } else if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else {
    root.Circles = factory();
  }


}(this, function() {

  "use strict";

  var requestAnimFrame = window.requestAnimationFrame ||
    window.webkitRequestAnimationFrame ||
    window.mozRequestAnimationFrame ||
    window.oRequestAnimationFrame ||
    window.msRequestAnimationFrame ||
    function(callback) {
      setTimeout(callback, 1000 / 60);
    },

    Circles = function(options) {
      var elId = options.id;
      this._el = document.getElementById(elId);

      if (this._el === null) return;

      this._radius = options.radius || 10;
      this._duration = options.duration === undefined ? 500 : options.duration;

      this._value = 0;
      this._maxValue = options.maxValue || 100;

      this._text = options.text === undefined ? function(value) {
        return this.htmlifyNumber(value);
      } : options.text;
      this._strokeWidth = options.width || 10;
      this._colors = options.colors || ['#EEE', '#F00'];
      this._svg = null;
      this._movingPath = null;
      this._wrapContainer = null;
      this._textContainer = null;

      this._wrpClass = options.wrpClass || 'circles-wrp';
      this._textClass = options.textClass || 'circles-text';

      this._valClass = options.valueStrokeClass || 'circles-valueStroke';
      this._maxValClass = options.maxValueStrokeClass || 'circles-maxValueStroke';

      this._styleWrapper = options.styleWrapper === false ? false : true;
      this._styleText = options.styleText === false ? false : true;

      var endAngleRad = Math.PI / 180 * 270;
      this._start = -Math.PI / 180 * 90;
      this._startPrecise = this._precise(this._start);
      this._circ = endAngleRad - this._start;

      this._generate().update(options.value || 0);
    };

  Circles.prototype = {
    VERSION: '0.0.6',

    _generate: function() {

      this._svgSize = this._radius * 2;
      this._radiusAdjusted = this._radius - (this._strokeWidth / 2);

      this._generateSvg()._generateText()._generateWrapper();

      this._el.innerHTML = '';
      this._el.appendChild(this._wrapContainer);

      return this;
    },

    _setPercentage: function(percentage) {
      this._movingPath.setAttribute('d', this._calculatePath(percentage, true));
      this._textContainer.innerHTML = this._getText(this.getValueFromPercent(percentage));
    },

    _generateWrapper: function() {
      this._wrapContainer = document.createElement('div');
      this._wrapContainer.className = this._wrpClass;

      if (this._styleWrapper) {
        this._wrapContainer.style.position = 'relative';
        this._wrapContainer.style.display = 'inline-block';
      }

      this._wrapContainer.appendChild(this._svg);
      this._wrapContainer.appendChild(this._textContainer);

      return this;
    },

    _generateText: function() {

      this._textContainer = document.createElement('div');
      this._textContainer.className = this._textClass;

      if (this._styleText) {
        var style = {
          position: 'absolute',
          top: 0,
          left: 0,
          textAlign: 'center',
          width: '100%',
          fontSize: (this._radius * .7) + 'px',
          height: this._svgSize + 'px',
          lineHeight: this._svgSize + 'px'
        };

        for (var prop in style) {
          this._textContainer.style[prop] = style[prop];
        }
      }

      this._textContainer.innerHTML = this._getText(0);
      return this;
    },

    _getText: function(value) {
      if (!this._text) return '';

      if (value === undefined) value = this._value;

      value = parseFloat(value.toFixed(2));

      return typeof this._text === 'function' ? this._text.call(this, value) : this._text;
    },

    _generateSvg: function() {

      this._svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      this._svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
      this._svg.setAttribute('width', this._svgSize);
      this._svg.setAttribute('height', this._svgSize);

      this._generatePath(100, false, this._colors[0], this._maxValClass)._generatePath(1, true, this._colors[1], this._valClass);

      this._movingPath = this._svg.getElementsByTagName('path')[1];

      return this;
    },

    _generatePath: function(percentage, open, color, pathClass) {
      var path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('fill', 'transparent');
      path.setAttribute('stroke', color);
      path.setAttribute('stroke-width', this._strokeWidth);
      path.setAttribute('d', this._calculatePath(percentage, open));
      path.setAttribute('class', pathClass);

      this._svg.appendChild(path);

      return this;
    },

    _calculatePath: function(percentage, open) {
      var end = this._start + ((percentage / 100) * this._circ),
        endPrecise = this._precise(end);
      return this._arc(endPrecise, open);
    },

    _arc: function(end, open) {
      var endAdjusted = end - 0.001,
        longArc = end - this._startPrecise < Math.PI ? 0 : 1;

      return [
        'M',
        this._radius + this._radiusAdjusted * Math.cos(this._startPrecise),
        this._radius + this._radiusAdjusted * Math.sin(this._startPrecise),
        'A', // arcTo
        this._radiusAdjusted, // x radius
        this._radiusAdjusted, // y radius
        0, // slanting
        longArc, // long or short arc
        1, // clockwise
        this._radius + this._radiusAdjusted * Math.cos(endAdjusted),
        this._radius + this._radiusAdjusted * Math.sin(endAdjusted),
        open ? '' : 'Z' // close
      ].join(' ');
    },

    _precise: function(value) {
      return Math.round(value * 1000) / 1000;
    },

    /*== Public methods ==*/

    htmlifyNumber: function(number, integerPartClass, decimalPartClass) {

      integerPartClass = integerPartClass || 'circles-integer';
      decimalPartClass = decimalPartClass || 'circles-decimals';

      var parts = (number + '').split('.'),
        html = '<span class="' + integerPartClass + '">' + parts[0] + '</span>';

      if (parts.length > 1) {
        html += '.<span class="' + decimalPartClass + '">' + parts[1].substring(0, 2) + '</span>';
      }
      return html;
    },

    updateRadius: function(radius) {
      this._radius = radius;

      return this._generate().update(true);
    },

    updateWidth: function(width) {
      this._strokeWidth = width;

      return this._generate().update(true);
    },

    updateColors: function(colors) {
      this._colors = colors;

      var paths = this._svg.getElementsByTagName('path');

      paths[0].setAttribute('stroke', colors[0]);
      paths[1].setAttribute('stroke', colors[1]);

      return this;
    },

    getPercent: function() {
      return (this._value * 100) / this._maxValue;
    },

    getValueFromPercent: function(percentage) {
      return (this._maxValue * percentage) / 100;
    },

    getValue: function() {
      return this._value;
    },

    getMaxValue: function() {
      return this._maxValue;
    },

    update: function(value, duration) {
      if (value === true) { //Force update with current value
        this._setPercentage(this.getPercent());
        return this;
      }

      if (this._value == value || isNaN(value)) return this;
      if (duration === undefined) duration = this._duration;

      var self = this,
        oldPercentage = self.getPercent(),
        delta = 1,
        newPercentage, isGreater, steps, stepDuration;

      this._value = Math.min(this._maxValue, Math.max(0, value));

      if (!duration) { //No duration, we can't skip the animation
        this._setPercentage(this.getPercent());
        return this;
      }

      newPercentage = self.getPercent();
      isGreater = newPercentage > oldPercentage;

      delta += newPercentage % 1; //If new percentage is not an integer, we add the decimal part to the delta
      steps = Math.floor(Math.abs(newPercentage - oldPercentage) / delta);
      stepDuration = duration / steps;


      (function animate(lastFrame) {
        if (isGreater)
          oldPercentage += delta;
        else
          oldPercentage -= delta;

        if ((isGreater && oldPercentage >= newPercentage) || (!isGreater && oldPercentage <= newPercentage)) {
          requestAnimFrame(function() {
            self._setPercentage(newPercentage);
          });
          return;
        }

        requestAnimFrame(function() {
          self._setPercentage(oldPercentage);
        });

        var now = Date.now(),
          deltaTime = now - lastFrame;

        if (deltaTime >= stepDuration) {
          animate(now);
        } else {
          setTimeout(function() {
            animate(Date.now());
          }, stepDuration - deltaTime);
        }

      })(Date.now());

      return this;
    }
  };

  Circles.create = function(options) {
    return new Circles(options);
  };

  return Circles;
}));
// jquery.easy-autocomplete.js
/*
 * easy-autocomplete
 * jQuery plugin for autocompletion
 *
 * @author Łukasz Pawełczak (http://github.com/pawelczak)
 * @version 1.3.5
 * Copyright  License:
 */

/*
 * EasyAutocomplete - Configuration
 */
var EasyAutocomplete = (function(scope) {

  scope.Configuration = function Configuration(options) {
    var defaults = {
      data: "list-required",
      url: "list-required",
      dataType: "json",

      listLocation: function(data) {
        return data;
      },

      xmlElementName: "",

      getValue: function(element) {
        return element;
      },

      autocompleteOff: true,

      placeholder: false,

      ajaxCallback: function() {},

      matchResponseProperty: false,

      list: {
        sort: {
          enabled: false,
          method: function(a, b) {
            a = defaults.getValue(a);
            b = defaults.getValue(b);
            if (a < b) {
              return -1;
            }
            if (a > b) {
              return 1;
            }
            return 0;
          }
        },

        maxNumberOfElements: 6,

        hideOnEmptyPhrase: true,

        match: {
          enabled: false,
          caseSensitive: false,
          method: function(element, phrase) {

            if (element.search(phrase) > -1) {
              return true;
            } else {
              return false;
            }
          }
        },

        showAnimation: {
          type: "normal", //normal|slide|fade
          time: 400,
          callback: function() {}
        },

        hideAnimation: {
          type: "normal",
          time: 400,
          callback: function() {}
        },

        /* Events */
        onClickEvent: function() {},
        onSelectItemEvent: function() {},
        onLoadEvent: function() {},
        onChooseEvent: function() {},
        onKeyEnterEvent: function() {},
        onMouseOverEvent: function() {},
        onMouseOutEvent: function() {},
        onShowListEvent: function() {},
        onHideListEvent: function() {}
      },

      highlightPhrase: true,

      theme: "",

      cssClasses: "",

      minCharNumber: 0,

      requestDelay: 0,

      adjustWidth: true,

      ajaxSettings: {},

      preparePostData: function(data, inputPhrase) {
        return data;
      },

      loggerEnabled: true,

      template: "",

      categoriesAssigned: false,

      categories: [{
        maxNumberOfElements: 4
      }]

    };

    var externalObjects = ["ajaxSettings", "template"];

    this.get = function(propertyName) {
      return defaults[propertyName];
    };

    this.equals = function(name, value) {
      if (isAssigned(name)) {
        if (defaults[name] === value) {
          return true;
        }
      }

      return false;
    };

    this.checkDataUrlProperties = function() {
      if (defaults.url === "list-required" && defaults.data === "list-required") {
        return false;
      }
      return true;
    };
    this.checkRequiredProperties = function() {
      for (var propertyName in defaults) {
        if (defaults[propertyName] === "required") {
          logger.error("Option " + propertyName + " must be defined");
          return false;
        }
      }
      return true;
    };

    this.printPropertiesThatDoesntExist = function(consol, optionsToCheck) {
      printPropertiesThatDoesntExist(consol, optionsToCheck);
    };


    prepareDefaults();

    mergeOptions();

    if (defaults.loggerEnabled === true) {
      printPropertiesThatDoesntExist(console, options);
    }

    addAjaxSettings();

    processAfterMerge();

    function prepareDefaults() {

      if (options.dataType === "xml") {

        if (!options.getValue) {

          options.getValue = function(element) {
            return $(element).text();
          };
        }


        if (!options.list) {

          options.list = {};
        }

        if (!options.list.sort) {
          options.list.sort = {};
        }


        options.list.sort.method = function(a, b) {
          a = options.getValue(a);
          b = options.getValue(b);
          if (a < b) {
            return -1;
          }
          if (a > b) {
            return 1;
          }
          return 0;
        };

        if (!options.list.match) {
          options.list.match = {};
        }

        options.list.match.method = function(element, phrase) {

          if (element.search(phrase) > -1) {
            return true;
          } else {
            return false;
          }
        };

      }
      if (options.categories !== undefined && options.categories instanceof Array) {

        var categories = [];

        for (var i = 0, length = options.categories.length; i < length; i += 1) {

          var category = options.categories[i];

          for (var property in defaults.categories[0]) {

            if (category[property] === undefined) {
              category[property] = defaults.categories[0][property];
            }
          }

          categories.push(category);
        }

        options.categories = categories;
      }
    }

    function mergeOptions() {

      defaults = mergeObjects(defaults, options);

      function mergeObjects(source, target) {
        var mergedObject = source || {};

        for (var propertyName in source) {
          if (target[propertyName] !== undefined && target[propertyName] !== null) {

            if (typeof target[propertyName] !== "object" ||
              target[propertyName] instanceof Array) {
              mergedObject[propertyName] = target[propertyName];
            } else {
              mergeObjects(source[propertyName], target[propertyName]);
            }
          }
        }

        /* If data is an object */
        if (target.data !== undefined && target.data !== null && typeof target.data === "object") {
          mergedObject.data = target.data;
        }

        return mergedObject;
      }
    }


    function processAfterMerge() {

      if (defaults.url !== "list-required" && typeof defaults.url !== "function") {
        var defaultUrl = defaults.url;
        defaults.url = function() {
          return defaultUrl;
        };
      }

      if (defaults.ajaxSettings.url !== undefined && typeof defaults.ajaxSettings.url !== "function") {
        var defaultUrl = defaults.ajaxSettings.url;
        defaults.ajaxSettings.url = function() {
          return defaultUrl;
        };
      }

      if (typeof defaults.listLocation === "string") {
        var defaultlistLocation = defaults.listLocation;

        if (defaults.dataType.toUpperCase() === "XML") {
          defaults.listLocation = function(data) {
            return $(data).find(defaultlistLocation);
          };
        } else {
          defaults.listLocation = function(data) {
            return data[defaultlistLocation];
          };
        }
      }

      if (typeof defaults.getValue === "string") {
        var defaultsGetValue = defaults.getValue;
        defaults.getValue = function(element) {
          return element[defaultsGetValue];
        };
      }

      if (options.categories !== undefined) {
        defaults.categoriesAssigned = true;
      }

    }

    function addAjaxSettings() {

      if (options.ajaxSettings !== undefined && typeof options.ajaxSettings === "object") {
        defaults.ajaxSettings = options.ajaxSettings;
      } else {
        defaults.ajaxSettings = {};
      }

    }

    function isAssigned(name) {
      if (defaults[name] !== undefined && defaults[name] !== null) {
        return true;
      } else {
        return false;
      }
    }

    function printPropertiesThatDoesntExist(consol, optionsToCheck) {

      checkPropertiesIfExist(defaults, optionsToCheck);

      function checkPropertiesIfExist(source, target) {
        for (var property in target) {
          if (source[property] === undefined) {
            consol.log("Property '" + property + "' does not exist in EasyAutocomplete options API.");
          }

          if (typeof source[property] === "object" && $.inArray(property, externalObjects) === -1) {
            checkPropertiesIfExist(source[property], target[property]);
          }
        }
      }
    }
  };

  return scope;

})(EasyAutocomplete || {});


/*
 * EasyAutocomplete - Logger
 */
var EasyAutocomplete = (function(scope) {

  scope.Logger = function Logger() {

    this.error = function(message) {
      console.log("ERROR: " + message);
    };

    this.warning = function(message) {
      console.log("WARNING: " + message);
    };
  };

  return scope;

})(EasyAutocomplete || {});


/*
 * EasyAutocomplete - Constans
 */
var EasyAutocomplete = (function(scope) {

  scope.Constans = function Constans() {
    var constants = {
      CONTAINER_CLASS: "easy-autocomplete-container",
      CONTAINER_ID: "eac-container-",

      WRAPPER_CSS_CLASS: "easy-autocomplete"
    };

    this.getValue = function(propertyName) {
      return constants[propertyName];
    };

  };

  return scope;

})(EasyAutocomplete || {});

/*
 * EasyAutocomplete - ListBuilderService
 *
 * @author Łukasz Pawełczak
 *
 */
var EasyAutocomplete = (function(scope) {

  scope.ListBuilderService = function ListBuilderService(configuration, proccessResponseData) {


    this.init = function(data) {
      var listBuilder = [],
        builder = {};

      builder.data = configuration.get("listLocation")(data);
      builder.getValue = configuration.get("getValue");
      builder.maxListSize = configuration.get("list").maxNumberOfElements;


      listBuilder.push(builder);

      return listBuilder;
    };

    this.updateCategories = function(listBuilder, data) {

      if (configuration.get("categoriesAssigned")) {

        listBuilder = [];

        for (var i = 0; i < configuration.get("categories").length; i += 1) {

          var builder = convertToListBuilder(configuration.get("categories")[i], data);

          listBuilder.push(builder);
        }

      }

      return listBuilder;
    };

    this.convertXml = function(listBuilder) {
      if (configuration.get("dataType").toUpperCase() === "XML") {

        for (var i = 0; i < listBuilder.length; i += 1) {
          listBuilder[i].data = convertXmlToList(listBuilder[i]);
        }
      }

      return listBuilder;
    };

    this.processData = function(listBuilder, inputPhrase) {

      for (var i = 0, length = listBuilder.length; i < length; i += 1) {
        listBuilder[i].data = proccessResponseData(configuration, listBuilder[i], inputPhrase);
      }

      return listBuilder;
    };

    this.checkIfDataExists = function(listBuilders) {

      for (var i = 0, length = listBuilders.length; i < length; i += 1) {

        if (listBuilders[i].data !== undefined && listBuilders[i].data instanceof Array) {
          if (listBuilders[i].data.length > 0) {
            return true;
          }
        }
      }

      return false;
    };


    function convertToListBuilder(category, data) {

      var builder = {};

      if (configuration.get("dataType").toUpperCase() === "XML") {

        builder = convertXmlToListBuilder();
      } else {

        builder = convertDataToListBuilder();
      }


      if (category.header !== undefined) {
        builder.header = category.header;
      }

      if (category.maxNumberOfElements !== undefined) {
        builder.maxNumberOfElements = category.maxNumberOfElements;
      }

      if (configuration.get("list").maxNumberOfElements !== undefined) {

        builder.maxListSize = configuration.get("list").maxNumberOfElements;
      }

      if (category.getValue !== undefined) {

        if (typeof category.getValue === "string") {
          var defaultsGetValue = category.getValue;
          builder.getValue = function(element) {
            return element[defaultsGetValue];
          };
        } else if (typeof category.getValue === "function") {
          builder.getValue = category.getValue;
        }

      } else {
        builder.getValue = configuration.get("getValue");
      }


      return builder;


      function convertXmlToListBuilder() {

        var builder = {},
          listLocation;

        if (category.xmlElementName !== undefined) {
          builder.xmlElementName = category.xmlElementName;
        }

        if (category.listLocation !== undefined) {

          listLocation = category.listLocation;
        } else if (configuration.get("listLocation") !== undefined) {

          listLocation = configuration.get("listLocation");
        }

        if (listLocation !== undefined) {
          if (typeof listLocation === "string") {
            builder.data = $(data).find(listLocation);
          } else if (typeof listLocation === "function") {

            builder.data = listLocation(data);
          }
        } else {

          builder.data = data;
        }

        return builder;
      }


      function convertDataToListBuilder() {

        var builder = {};

        if (category.listLocation !== undefined) {

          if (typeof category.listLocation === "string") {
            builder.data = data[category.listLocation];
          } else if (typeof category.listLocation === "function") {
            builder.data = category.listLocation(data);
          }
        } else {
          builder.data = data;
        }

        return builder;
      }
    }

    function convertXmlToList(builder) {
      var simpleList = [];

      if (builder.xmlElementName === undefined) {
        builder.xmlElementName = configuration.get("xmlElementName");
      }


      $(builder.data).find(builder.xmlElementName).each(function() {
        simpleList.push(this);
      });

      return simpleList;
    }

  };

  return scope;

})(EasyAutocomplete || {});


/*
 * EasyAutocomplete - Data proccess module
 *
 * Process list to display:
 * - sort
 * - decrease number to specific number
 * - show only matching list
 *
 */
var EasyAutocomplete = (function(scope) {

  scope.proccess = function proccessData(config, listBuilder, phrase) {

    scope.proccess.match = match;

    var list = listBuilder.data,
      inputPhrase = phrase; //TODO REFACTOR

    list = findMatch(list, inputPhrase);
    list = reduceElementsInList(list);
    list = sort(list);

    return list;


    function findMatch(list, phrase) {
      var preparedList = [],
        value = "";

      if (config.get("list").match.enabled) {

        for (var i = 0, length = list.length; i < length; i += 1) {

          value = config.get("getValue")(list[i]);

          if (match(value, phrase)) {
            preparedList.push(list[i]);
          }

        }

      } else {
        preparedList = list;
      }

      return preparedList;
    }

    function match(value, phrase) {

      if (!config.get("list").match.caseSensitive) {

        if (typeof value === "string") {
          value = value.toLowerCase();
        }

        phrase = phrase.toLowerCase();
      }
      if (config.get("list").match.method(value, phrase)) {
        return true;
      } else {
        return false;
      }
    }

    function reduceElementsInList(list) {
      if (listBuilder.maxNumberOfElements !== undefined && list.length > listBuilder.maxNumberOfElements) {
        list = list.slice(0, listBuilder.maxNumberOfElements);
      }

      return list;
    }

    function sort(list) {
      if (config.get("list").sort.enabled) {
        list.sort(config.get("list").sort.method);
      }

      return list;
    }

  };


  return scope;


})(EasyAutocomplete || {});


/*
 * EasyAutocomplete - Template
 *
 *
 *
 */
var EasyAutocomplete = (function(scope) {

  scope.Template = function Template(options) {


    var genericTemplates = {
        basic: {
          type: "basic",
          method: function(element) {
            return element;
          },
          cssClass: ""
        },
        description: {
          type: "description",
          fields: {
            description: "description"
          },
          method: function(element) {
            return element + " - description";
          },
          cssClass: "eac-description"
        },
        iconLeft: {
          type: "iconLeft",
          fields: {
            icon: ""
          },
          method: function(element) {
            return element;
          },
          cssClass: "eac-icon-left"
        },
        iconRight: {
          type: "iconRight",
          fields: {
            iconSrc: ""
          },
          method: function(element) {
            return element;
          },
          cssClass: "eac-icon-right"
        },
        links: {
          type: "links",
          fields: {
            link: ""
          },
          method: function(element) {
            return element;
          },
          cssClass: ""
        },
        custom: {
          type: "custom",
          method: function() {},
          cssClass: ""
        }
      },



      /*
       * Converts method with {{text}} to function
       */
      convertTemplateToMethod = function(template) {


        var _fields = template.fields,
          buildMethod;

        if (template.type === "description") {

          buildMethod = genericTemplates.description.method;

          if (typeof _fields.description === "string") {
            buildMethod = function(elementValue, element) {
              return elementValue + " - <span>" + element[_fields.description] + "</span>";
            };
          } else if (typeof _fields.description === "function") {
            buildMethod = function(elementValue, element) {
              return elementValue + " - <span>" + _fields.description(element) + "</span>";
            };
          }

          return buildMethod;
        }

        if (template.type === "iconRight") {

          if (typeof _fields.iconSrc === "string") {
            buildMethod = function(elementValue, element) {
              return elementValue + "<img class='eac-icon' src='" + element[_fields.iconSrc] + "' />";
            };
          } else if (typeof _fields.iconSrc === "function") {
            buildMethod = function(elementValue, element) {
              return elementValue + "<img class='eac-icon' src='" + _fields.iconSrc(element) + "' />";
            };
          }

          return buildMethod;
        }


        if (template.type === "iconLeft") {

          if (typeof _fields.iconSrc === "string") {
            buildMethod = function(elementValue, element) {
              return "<img class='eac-icon' src='" + element[_fields.iconSrc] + "' />" + elementValue;
            };
          } else if (typeof _fields.iconSrc === "function") {
            buildMethod = function(elementValue, element) {
              return "<img class='eac-icon' src='" + _fields.iconSrc(element) + "' />" + elementValue;
            };
          }

          return buildMethod;
        }

        if (template.type === "links") {

          if (typeof _fields.link === "string") {
            buildMethod = function(elementValue, element) {
              return "<a href='" + element[_fields.link] + "' >" + elementValue + "</a>";
            };
          } else if (typeof _fields.link === "function") {
            buildMethod = function(elementValue, element) {
              return "<a href='" + _fields.link(element) + "' >" + elementValue + "</a>";
            };
          }

          return buildMethod;
        }


        if (template.type === "custom") {

          return template.method;
        }

        return genericTemplates.basic.method;

      },


      prepareBuildMethod = function(options) {
        if (!options || !options.type) {

          return genericTemplates.basic.method;
        }

        if (options.type && genericTemplates[options.type]) {

          return convertTemplateToMethod(options);
        } else {

          return genericTemplates.basic.method;
        }

      },

      templateClass = function(options) {
        var emptyStringFunction = function() {
          return "";
        };

        if (!options || !options.type) {

          return emptyStringFunction;
        }

        if (options.type && genericTemplates[options.type]) {
          return (function() {
            var _cssClass = genericTemplates[options.type].cssClass;
            return function() {
              return _cssClass;
            };
          })();
        } else {
          return emptyStringFunction;
        }
      };


    this.getTemplateClass = templateClass(options);

    this.build = prepareBuildMethod(options);


  };

  return scope;

})(EasyAutocomplete || {});


/*
 * EasyAutocomplete - jQuery plugin for autocompletion
 *
 */
var EasyAutocomplete = (function(scope) {


  scope.main = function Core($input, options) {

    var module = {
      name: "EasyAutocomplete",
      shortcut: "eac"
    };

    var consts = new scope.Constans(),
      config = new scope.Configuration(options),
      logger = new scope.Logger(),
      template = new scope.Template(options.template),
      listBuilderService = new scope.ListBuilderService(config, scope.proccess),
      checkParam = config.equals,

      $field = $input,
      $container = "",
      elementsList = [],
      selectedElement = -1,
      requestDelayTimeoutId;

    scope.consts = consts;

    this.getConstants = function() {
      return consts;
    };

    this.getConfiguration = function() {
      return config;
    };

    this.getContainer = function() {
      return $container;
    };

    this.getSelectedItemIndex = function() {
      return selectedElement;
    };

    this.getItems = function() {
      return elementsList;
    };

    this.getItemData = function(index) {

      if (elementsList.length < index || elementsList[index] === undefined) {
        return -1;
      } else {
        return elementsList[index];
      }
    };

    this.getSelectedItemData = function() {
      return this.getItemData(selectedElement);
    };

    this.build = function() {
      prepareField();
    };

    this.init = function() {
      init();
    };

    function init() {

      if ($field.length === 0) {
        logger.error("Input field doesn't exist.");
        return;
      }

      if (!config.checkDataUrlProperties()) {
        logger.error("One of options variables 'data' or 'url' must be defined.");
        return;
      }

      if (!config.checkRequiredProperties()) {
        logger.error("Will not work without mentioned properties.");
        return;
      }


      prepareField();
      bindEvents();

    }

    function prepareField() {


      if ($field.parent().hasClass(consts.getValue("WRAPPER_CSS_CLASS"))) {
        removeContainer();
        removeWrapper();
      }

      createWrapper();
      createContainer();

      $container = $("#" + getContainerId());
      if (config.get("placeholder")) {
        $field.attr("placeholder", config.get("placeholder"));
      }


      function createWrapper() {
        var $wrapper = $("<div>"),
          classes = consts.getValue("WRAPPER_CSS_CLASS");


        if (config.get("theme") && config.get("theme") !== "") {
          classes += " eac-" + config.get("theme");
        }

        if (config.get("cssClasses") && config.get("cssClasses") !== "") {
          classes += " " + config.get("cssClasses");
        }

        if (template.getTemplateClass() !== "") {
          classes += " " + template.getTemplateClass();
        }


        $wrapper
          .addClass(classes);
        $field.wrap($wrapper);


        if (config.get("adjustWidth") === true) {
          adjustWrapperWidth();
        }


      }

      function adjustWrapperWidth() {
        var fieldWidth = $field.outerWidth();

        $field.parent().css("width", fieldWidth);
      }

      function removeWrapper() {
        $field.unwrap();
      }

      function createContainer() {
        var $elements_container = $("<div>").addClass(consts.getValue("CONTAINER_CLASS"));

        $elements_container
          .attr("id", getContainerId())
          .prepend($("<ul>"));


        (function() {

          $elements_container
          /* List show animation */
            .on("show.eac", function() {

              switch (config.get("list").showAnimation.type) {

                case "slide":
                  var animationTime = config.get("list").showAnimation.time,
                    callback = config.get("list").showAnimation.callback;

                  $elements_container.find("ul").slideDown(animationTime, callback);
                  break;

                case "fade":
                  var animationTime = config.get("list").showAnimation.time,
                    callback = config.get("list").showAnimation.callback;

                  $elements_container.find("ul").fadeIn(animationTime), callback;
                  break;

                default:
                  $elements_container.find("ul").show();
                  break;
              }

              config.get("list").onShowListEvent();

            })
            /* List hide animation */
            .on("hide.eac", function() {

              switch (config.get("list").hideAnimation.type) {

                case "slide":
                  var animationTime = config.get("list").hideAnimation.time,
                    callback = config.get("list").hideAnimation.callback;

                  $elements_container.find("ul").slideUp(animationTime, callback);
                  break;

                case "fade":
                  var animationTime = config.get("list").hideAnimation.time,
                    callback = config.get("list").hideAnimation.callback;

                  $elements_container.find("ul").fadeOut(animationTime, callback);
                  break;

                default:
                  $elements_container.find("ul").hide();
                  break;
              }

              config.get("list").onHideListEvent();

            })
            .on("selectElement.eac", function() {
              $elements_container.find("ul li").removeClass("selected");
              $elements_container.find("ul li").eq(selectedElement).addClass("selected");

              config.get("list").onSelectItemEvent();
            })
            .on("loadElements.eac", function(event, listBuilders, phrase) {


              var $item = "",
                $listContainer = $elements_container.find("ul");

              $listContainer
                .empty()
                .detach();

              elementsList = [];
              var counter = 0;
              for (var builderIndex = 0, listBuildersLength = listBuilders.length; builderIndex < listBuildersLength; builderIndex += 1) {

                var listData = listBuilders[builderIndex].data;

                if (listData.length === 0) {
                  continue;
                }

                if (listBuilders[builderIndex].header !== undefined && listBuilders[builderIndex].header.length > 0) {
                  $listContainer.append("<div class='eac-category' >" + listBuilders[builderIndex].header + "</div>");
                }

                for (var i = 0, listDataLength = listData.length; i < listDataLength && counter < listBuilders[builderIndex].maxListSize; i += 1) {
                  $item = $("<li><div class='eac-item'></div></li>");


                  (function() {
                    var j = i,
                      itemCounter = counter,
                      elementsValue = listBuilders[builderIndex].getValue(listData[j]);

                    $item.find(" > div")
                      .on("click", function() {

                        $field.val(elementsValue).trigger("change");

                        selectedElement = itemCounter;
                        selectElement(itemCounter);

                        config.get("list").onClickEvent();
                        config.get("list").onChooseEvent();
                      })
                      .mouseover(function() {

                        selectedElement = itemCounter;
                        selectElement(itemCounter);

                        config.get("list").onMouseOverEvent();
                      })
                      .mouseout(function() {
                        config.get("list").onMouseOutEvent();
                      })
                      .html(template.build(highlight(elementsValue, phrase), listData[j]));
                  })();

                  $listContainer.append($item);
                  elementsList.push(listData[i]);
                  counter += 1;
                }
              }

              $elements_container.append($listContainer);

              config.get("list").onLoadEvent();
            });

        })();

        $field.after($elements_container);
      }

      function removeContainer() {
        $field.next("." + consts.getValue("CONTAINER_CLASS")).remove();
      }

      function highlight(string, phrase) {

        if (config.get("highlightPhrase") && phrase !== "") {
          return highlightPhrase(string, phrase);
        } else {
          return string;
        }

      }

      function escapeRegExp(str) {
        return str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");
      }

      function highlightPhrase(string, phrase) {
        var escapedPhrase = escapeRegExp(phrase);
        return (string + "").replace(new RegExp("(" + escapedPhrase + ")", "gi"), "<b>$1</b>");
      }



    }

    function getContainerId() {

      var elementId = $field.attr("id");

      elementId = consts.getValue("CONTAINER_ID") + elementId;

      return elementId;
    }

    function bindEvents() {

      bindAllEvents();


      function bindAllEvents() {
        if (checkParam("autocompleteOff", true)) {
          removeAutocomplete();
        }

        bindFocusOut();
        bindKeyup();
        bindKeydown();
        bindKeypress();
        bindFocus();
        bindBlur();
      }

      function bindFocusOut() {
        $field.focusout(function() {

          var fieldValue = $field.val(),
            phrase;

          if (!config.get("list").match.caseSensitive) {
            fieldValue = fieldValue.toLowerCase();
          }

          for (var i = 0, length = elementsList.length; i < length; i += 1) {

            phrase = config.get("getValue")(elementsList[i]);
            if (!config.get("list").match.caseSensitive) {
              phrase = phrase.toLowerCase();
            }

            if (phrase === fieldValue) {
              selectedElement = i;
              selectElement(selectedElement);
              return;
            }
          }
        });
      }

      function bindKeyup() {
        $field
          .off("keyup")
          .keyup(function(event) {

            switch (event.keyCode) {

              case 27:

                hideContainer();
                loseFieldFocus();
                break;

              case 38:

                event.preventDefault();

                if (elementsList.length > 0 && selectedElement > 0) {

                  selectedElement -= 1;

                  $field.val(config.get("getValue")(elementsList[selectedElement]));

                  selectElement(selectedElement);

                }
                break;

              case 40:

                event.preventDefault();

                if (elementsList.length > 0 && selectedElement < elementsList.length - 1) {

                  selectedElement += 1;

                  $field.val(config.get("getValue")(elementsList[selectedElement]));

                  selectElement(selectedElement);

                }

                break;

              default:

                if (event.keyCode > 40 || event.keyCode === 8) {

                  var inputPhrase = $field.val();

                  if (!(config.get("list").hideOnEmptyPhrase === true && event.keyCode === 8 && inputPhrase === "")) {

                    if (config.get("requestDelay") > 0) {
                      if (requestDelayTimeoutId !== undefined) {
                        clearTimeout(requestDelayTimeoutId);
                      }

                      requestDelayTimeoutId = setTimeout(function() {
                        loadData(inputPhrase);
                      }, config.get("requestDelay"));
                    } else {
                      loadData(inputPhrase);
                    }

                  } else {
                    hideContainer();
                  }

                }


                break;
            }


            function loadData(inputPhrase) {


              if (inputPhrase.length < config.get("minCharNumber")) {
                return;
              }


              if (config.get("data") !== "list-required") {

                var data = config.get("data");

                var listBuilders = listBuilderService.init(data);

                listBuilders = listBuilderService.updateCategories(listBuilders, data);

                listBuilders = listBuilderService.processData(listBuilders, inputPhrase);

                loadElements(listBuilders, inputPhrase);

                if ($field.parent().find("li").length > 0) {
                  showContainer();
                } else {
                  hideContainer();
                }

              }

              var settings = createAjaxSettings();

              if (settings.url === undefined || settings.url === "") {
                settings.url = config.get("url");
              }

              if (settings.dataType === undefined || settings.dataType === "") {
                settings.dataType = config.get("dataType");
              }


              if (settings.url !== undefined && settings.url !== "list-required") {

                settings.url = settings.url(inputPhrase);

                settings.data = config.get("preparePostData")(settings.data, inputPhrase);

                $.ajax(settings)
                  .done(function(data) {

                    var listBuilders = listBuilderService.init(data);

                    listBuilders = listBuilderService.updateCategories(listBuilders, data);

                    listBuilders = listBuilderService.convertXml(listBuilders);
                    if (checkInputPhraseMatchResponse(inputPhrase, data)) {

                      listBuilders = listBuilderService.processData(listBuilders, inputPhrase);

                      loadElements(listBuilders, inputPhrase);

                    }

                    if (listBuilderService.checkIfDataExists(listBuilders) && $field.parent().find("li").length > 0) {
                      showContainer();
                    } else {
                      hideContainer();
                    }

                    config.get("ajaxCallback")();

                  })
                  .fail(function() {
                    logger.warning("Fail to load response data");
                  })
                  .always(function() {

                  });
              }



              function createAjaxSettings() {

                var settings = {},
                  ajaxSettings = config.get("ajaxSettings") || {};

                for (var set in ajaxSettings) {
                  settings[set] = ajaxSettings[set];
                }

                return settings;
              }

              function checkInputPhraseMatchResponse(inputPhrase, data) {

                if (config.get("matchResponseProperty") !== false) {
                  if (typeof config.get("matchResponseProperty") === "string") {
                    return (data[config.get("matchResponseProperty")] === inputPhrase);
                  }

                  if (typeof config.get("matchResponseProperty") === "function") {
                    return (config.get("matchResponseProperty")(data) === inputPhrase);
                  }

                  return true;
                } else {
                  return true;
                }

              }

            }


          });
      }

      function bindKeydown() {
        $field
          .on("keydown", function(evt) {
            evt = evt || window.event;
            var keyCode = evt.keyCode;
            if (keyCode === 38) {
              suppressKeypress = true;
              return false;
            }
          })
          .keydown(function(event) {

            if (event.keyCode === 13 && selectedElement > -1) {

              $field.val(config.get("getValue")(elementsList[selectedElement]));

              config.get("list").onKeyEnterEvent();
              config.get("list").onChooseEvent();

              selectedElement = -1;
              hideContainer();

              event.preventDefault();
            }
          });
      }

      function bindKeypress() {
        $field
          .off("keypress");
      }

      function bindFocus() {
        $field.focus(function() {

          if ($field.val() !== "" && elementsList.length > 0) {

            selectedElement = -1;
            showContainer();
          }

        });
      }

      function bindBlur() {
        $field.blur(function() {
          setTimeout(function() {

            selectedElement = -1;
            hideContainer();
          }, 250);
        });
      }

      function removeAutocomplete() {
        $field.attr("autocomplete", "off");
      }

    }

    function showContainer() {
      $container.trigger("show.eac");
    }

    function hideContainer() {
      $container.trigger("hide.eac");
    }

    function selectElement(index) {

      $container.trigger("selectElement.eac", index);
    }

    function loadElements(list, phrase) {
      $container.trigger("loadElements.eac", [list, phrase]);
    }

    function loseFieldFocus() {
      $field.trigger("blur");
    }


  };
  scope.eacHandles = [];

  scope.getHandle = function(id) {
    return scope.eacHandles[id];
  };

  scope.inputHasId = function(input) {

    if ($(input).attr("id") !== undefined && $(input).attr("id").length > 0) {
      return true;
    } else {
      return false;
    }

  };

  scope.assignRandomId = function(input) {

    var fieldId = "";

    do {
      fieldId = "eac-" + Math.floor(Math.random() * 10000);
    } while ($("#" + fieldId).length !== 0);

    elementId = scope.consts.getValue("CONTAINER_ID") + fieldId;

    $(input).attr("id", fieldId);

  };

  scope.setHandle = function(handle, id) {
    scope.eacHandles[id] = handle;
  };


  return scope;

})(EasyAutocomplete || {});

(function($) {

  $.fn.easyAutocomplete = function(options) {

    return this.each(function() {
      var $this = $(this),
        eacHandle = new EasyAutocomplete.main($this, options);

      if (!EasyAutocomplete.inputHasId($this)) {
        EasyAutocomplete.assignRandomId($this);
      }

      eacHandle.init();

      EasyAutocomplete.setHandle(eacHandle, $this.attr("id"));

    });
  };

  $.fn.getSelectedItemIndex = function() {

    var inputId = $(this).attr("id");

    if (inputId !== undefined) {
      return EasyAutocomplete.getHandle(inputId).getSelectedItemIndex();
    }

    return -1;
  };

  $.fn.getItems = function() {

    var inputId = $(this).attr("id");

    if (inputId !== undefined) {
      return EasyAutocomplete.getHandle(inputId).getItems();
    }

    return -1;
  };

  $.fn.getItemData = function(index) {

    var inputId = $(this).attr("id");

    if (inputId !== undefined && index > -1) {
      return EasyAutocomplete.getHandle(inputId).getItemData(index);
    }

    return -1;
  };

  $.fn.getSelectedItemData = function() {

    var inputId = $(this).attr("id");

    if (inputId !== undefined) {
      return EasyAutocomplete.getHandle(inputId).getSelectedItemData();
    }

    return -1;
  };

})(jQuery);
// lity.js
/*! Lity - v2.2.0 - 2016-10-08
 * http://sorgalla.com/lity/
 * Copyright (c) 2015-2016 Jan Sorgalla; Licensed MIT */
(function(window, factory) {
  if (typeof define === 'function' && define.amd) {
    define(['jquery'], function($) {
      return factory(window, $);
    });
  } else if (typeof module === 'object' && typeof module.exports === 'object') {
    module.exports = factory(window, require('jquery'));
  } else {
    window.lity = factory(window, window.jQuery || window.Zepto);
  }
}(typeof window !== "undefined" ? window : this, function(window, $) {
  'use strict';

  var document = window.document;

  var _win = $(window);
  var _deferred = $.Deferred;
  var _html = $('html');
  var _instances = [];

  var _attrAriaHidden = 'aria-hidden';
  var _dataAriaHidden = 'lity-' + _attrAriaHidden;

  var _focusableElementsSelector = 'a[href],area[href],input:not([disabled]),select:not([disabled]),textarea:not([disabled]),button:not([disabled]),iframe,object,embed,[contenteditable],[tabindex]:not([tabindex^="-"])';

  var _defaultOptions = {
    handler: null,
    handlers: {
      image: imageHandler,
      inline: inlineHandler,
      youtube: youtubeHandler,
      vimeo: vimeoHandler,
      googlemaps: googlemapsHandler,
      facebookvideo: facebookvideoHandler,
      iframe: iframeHandler
    },
    template: '<div class="lity" role="dialog" aria-label="Dialog Window (Press escape to close)" tabindex="-1"><div class="lity-wrap" data-lity-close role="document"><div class="lity-loader" aria-hidden="true">Loading...</div><div class="lity-container"><div class="lity-content"></div><button class="lity-close" type="button" aria-label="Close (Press escape to close)" data-lity-close>&times;</button></div></div></div>'
  };

  var _imageRegexp = /(^data:image\/)|(\.(png|jpe?g|gif|svg|webp|bmp|ico|tiff?)(\?\S*)?$)/i;
  var _youtubeRegex = /(youtube(-nocookie)?\.com|youtu\.be)\/(watch\?v=|v\/|u\/|embed\/?)?([\w-]{11})(.*)?/i;
  var _vimeoRegex = /(vimeo(pro)?.com)\/(?:[^\d]+)?(\d+)\??(.*)?$/;
  var _googlemapsRegex = /((maps|www)\.)?google\.([^\/\?]+)\/?((maps\/?)?\?)(.*)/i;
  var _facebookvideoRegex = /(facebook\.com)\/([a-z0-9_-]*)\/videos\/([0-9]*)(.*)?$/i;

  var _transitionEndEvent = (function() {
    var el = document.createElement('div');

    var transEndEventNames = {
      WebkitTransition: 'webkitTransitionEnd',
      MozTransition: 'transitionend',
      OTransition: 'oTransitionEnd otransitionend',
      transition: 'transitionend'
    };

    for (var name in transEndEventNames) {
      if (el.style[name] !== undefined) {
        return transEndEventNames[name];
      }
    }

    return false;
  })();

  function transitionEnd(element) {
    var deferred = _deferred();

    if (!_transitionEndEvent || !element.length) {
      deferred.resolve();
    } else {
      element.one(_transitionEndEvent, deferred.resolve);
      setTimeout(deferred.resolve, 500);
    }

    return deferred.promise();
  }

  function settings(currSettings, key, value) {
    if (arguments.length === 1) {
      return $.extend({}, currSettings);
    }

    if (typeof key === 'string') {
      if (typeof value === 'undefined') {
        return typeof currSettings[key] === 'undefined' ? null : currSettings[key];
      }

      currSettings[key] = value;
    } else {
      $.extend(currSettings, key);
    }

    return this;
  }

  function parseQueryParams(params) {
    var pairs = decodeURI(params.split('#')[0]).split('&');
    var obj = {},
      p;

    for (var i = 0, n = pairs.length; i < n; i++) {
      if (!pairs[i]) {
        continue;
      }

      p = pairs[i].split('=');
      obj[p[0]] = p[1];
    }

    return obj;
  }

  function appendQueryParams(url, params) {
    return url + (url.indexOf('?') > -1 ? '&' : '?') + $.param(params);
  }

  function transferHash(originalUrl, newUrl) {
    var pos = originalUrl.indexOf('#');

    if (-1 === pos) {
      return newUrl;
    }

    if (pos > 0) {
      originalUrl = originalUrl.substr(pos);
    }

    return newUrl + originalUrl;
  }

  function error(msg) {
    return $('<span class="lity-error"/>').append(msg);
  }

  function imageHandler(target, instance) {
    var desc = (instance.opener() && instance.opener().data('lity-desc')) || 'Image with no description';
    var img = $('<img src="' + target + '" alt="' + desc + '"/>');
    var deferred = _deferred();
    var failed = function() {
      deferred.reject(error('Failed loading image'));
    };

    img
      .on('load', function() {
        if (this.naturalWidth === 0) {
          return failed();
        }

        deferred.resolve(img);
      })
      .on('error', failed);

    return deferred.promise();
  }

  imageHandler.test = function(target) {
    return _imageRegexp.test(target);
  };

  function inlineHandler(target, instance) {
    var el, placeholder, hasHideClass;

    try {
      el = $(target);
    } catch (e) {
      return false;
    }

    if (!el.length) {
      return false;
    }

    placeholder = $('<i style="display:none !important"/>');
    hasHideClass = el.hasClass('lity-hide');

    instance
      .element()
      .one('lity:remove', function() {
        placeholder
          .before(el)
          .remove();

        if (hasHideClass && !el.closest('.lity-content').length) {
          el.addClass('lity-hide');
        }
      });

    return el
      .removeClass('lity-hide')
      .after(placeholder);
  }

  function youtubeHandler(target) {
    var matches = _youtubeRegex.exec(target);

    if (!matches) {
      return false;
    }

    return iframeHandler(
      transferHash(
        target,
        appendQueryParams(
          'https://www.youtube' + (matches[2] || '') + '.com/embed/' + matches[4],
          $.extend({
              autoplay: 1
            },
            parseQueryParams(matches[5] || '')
          )
        )
      )
    );
  }

  function vimeoHandler(target) {
    var matches = _vimeoRegex.exec(target);

    if (!matches) {
      return false;
    }

    return iframeHandler(
      transferHash(
        target,
        appendQueryParams(
          'https://player.vimeo.com/video/' + matches[3],
          $.extend({
              autoplay: 1
            },
            parseQueryParams(matches[4] || '')
          )
        )
      )
    );
  }

  function facebookvideoHandler(target) {
    var matches = _facebookvideoRegex.exec(target);

    if (!matches) {
      return false;
    }

    if (0 !== target.indexOf('http')) {
      target = 'https:' + target;
    }

    return iframeHandler(
      transferHash(
        target,
        appendQueryParams(
          'https://www.facebook.com/plugins/video.php?href=' + target,
          $.extend({
              autoplay: 1
            },
            parseQueryParams(matches[4] || '')
          )
        )
      )
    );
  }

  function googlemapsHandler(target) {
    var matches = _googlemapsRegex.exec(target);

    if (!matches) {
      return false;
    }

    return iframeHandler(
      transferHash(
        target,
        appendQueryParams(
          'https://www.google.' + matches[3] + '/maps?' + matches[6], {
            output: matches[6].indexOf('layer=c') > 0 ? 'svembed' : 'embed'
          }
        )
      )
    );
  }

  function iframeHandler(target) {
    return '<div class="lity-iframe-container"><iframe frameborder="0" allowfullscreen src="' + target + '"/></div>';
  }

  function winHeight() {
    return document.documentElement.clientHeight ? document.documentElement.clientHeight : Math.round(_win.height());
  }

  function keydown(e) {
    var current = currentInstance();

    if (!current) {
      return;
    }

    // ESC key
    if (e.keyCode === 27) {
      current.close();
    }

    // TAB key
    if (e.keyCode === 9) {
      handleTabKey(e, current);
    }
  }

  function handleTabKey(e, instance) {
    var focusableElements = instance.element().find(_focusableElementsSelector);
    var focusedIndex = focusableElements.index(document.activeElement);

    if (e.shiftKey && focusedIndex <= 0) {
      focusableElements.get(focusableElements.length - 1).focus();
      e.preventDefault();
    } else if (!e.shiftKey && focusedIndex === focusableElements.length - 1) {
      focusableElements.get(0).focus();
      e.preventDefault();
    }
  }

  function resize() {
    $.each(_instances, function(i, instance) {
      instance.resize();
    });
  }

  function registerInstance(instanceToRegister) {
    if (1 === _instances.unshift(instanceToRegister)) {
      _html.addClass('lity-active');

      _win
        .on({
          resize: resize,
          keydown: keydown
        });
    }

    $('body > *').not(instanceToRegister.element())
      .addClass('lity-hidden')
      .each(function() {
        var el = $(this);

        if (undefined !== el.data(_dataAriaHidden)) {
          return;
        }

        el.data(_dataAriaHidden, el.attr(_attrAriaHidden) || null);
      })
      .attr(_attrAriaHidden, 'true');
  }

  function removeInstance(instanceToRemove) {
    var show;

    instanceToRemove
      .element()
      .attr(_attrAriaHidden, 'true');

    if (1 === _instances.length) {
      _html.removeClass('lity-active');

      _win
        .off({
          resize: resize,
          keydown: keydown
        });
    }

    _instances = $.grep(_instances, function(instance) {
      return instanceToRemove !== instance;
    });

    if (!!_instances.length) {
      show = _instances[0].element();
    } else {
      show = $('.lity-hidden');
    }

    show
      .removeClass('lity-hidden')
      .each(function() {
        var el = $(this),
          oldAttr = el.data(_dataAriaHidden);

        if (!oldAttr) {
          el.removeAttr(_attrAriaHidden);
        } else {
          el.attr(_attrAriaHidden, oldAttr);
        }

        el.removeData(_dataAriaHidden);
      });
  }

  function currentInstance() {
    if (0 === _instances.length) {
      return null;
    }

    return _instances[0];
  }

  function factory(target, instance, handlers, preferredHandler) {
    var handler = 'inline',
      content;

    var currentHandlers = $.extend({}, handlers);

    if (preferredHandler && currentHandlers[preferredHandler]) {
      content = currentHandlers[preferredHandler](target, instance);
      handler = preferredHandler;
    } else {
      // Run inline and iframe handlers after all other handlers
      $.each(['inline', 'iframe'], function(i, name) {
        delete currentHandlers[name];

        currentHandlers[name] = handlers[name];
      });

      $.each(currentHandlers, function(name, currentHandler) {
        // Handler might be "removed" by setting callback to null
        if (!currentHandler) {
          return true;
        }

        if (
          currentHandler.test &&
          !currentHandler.test(target, instance)
        ) {
          return true;
        }

        content = currentHandler(target, instance);

        if (false !== content) {
          handler = name;
          return false;
        }
      });
    }

    return {
      handler: handler,
      content: content || ''
    };
  }

  function Lity(target, options, opener, activeElement) {
    var self = this;
    var result;
    var isReady = false;
    var isClosed = false;
    var element;
    var content;

    options = $.extend({},
      _defaultOptions,
      options
    );

    element = $(options.template);

    // -- API --

    self.element = function() {
      return element;
    };

    self.opener = function() {
      return opener;
    };

    self.options = $.proxy(settings, self, options);
    self.handlers = $.proxy(settings, self, options.handlers);

    self.resize = function() {
      if (!isReady || isClosed) {
        return;
      }

      content
        .css('max-height', winHeight() + 'px')
        .trigger('lity:resize', [self]);
    };

    self.close = function() {
      if (!isReady || isClosed) {
        return;
      }

      isClosed = true;

      removeInstance(self);

      var deferred = _deferred();

      // We return focus only if the current focus is inside this instance
      if (activeElement && $.contains(element[0], document.activeElement)) {
        activeElement.focus();
      }

      content.trigger('lity:close', [self]);

      element
        .removeClass('lity-opened')
        .addClass('lity-closed');

      transitionEnd(content.add(element))
        .always(function() {
          content.trigger('lity:remove', [self]);
          element.remove();
          element = undefined;
          deferred.resolve();
        });

      return deferred.promise();
    };

    // -- Initialization --

    result = factory(target, self, options.handlers, options.handler);

    element
      .attr(_attrAriaHidden, 'false')
      .addClass('lity-loading lity-opened lity-' + result.handler)
      .appendTo('body')
      .focus()
      .on('click', '[data-lity-close]', function(e) {
        if ($(e.target).is('[data-lity-close]')) {
          self.close();
        }
      })
      .trigger('lity:open', [self]);

    registerInstance(self);

    $.when(result.content)
      .always(ready);

    function ready(result) {
      content = $(result)
        .css('max-height', winHeight() + 'px');

      element
        .find('.lity-loader')
        .each(function() {
          var loader = $(this);

          transitionEnd(loader)
            .always(function() {
              loader.remove();
            });
        });

      element
        .removeClass('lity-loading')
        .find('.lity-content')
        .empty()
        .append(content);

      isReady = true;

      content
        .trigger('lity:ready', [self]);
    }
  }

  function lity(target, options, opener) {
    if (!target.preventDefault) {
      opener = $(opener);
    } else {
      target.preventDefault();
      opener = $(this);
      target = opener.data('lity-target') || opener.attr('href') || opener.attr('src');
    }

    var instance = new Lity(
      target,
      $.extend({},
        opener.data('lity-options') || opener.data('lity'),
        options
      ),
      opener,
      document.activeElement
    );

    if (!target.preventDefault) {
      return instance;
    }
  }

  lity.version = '2.2.0';
  lity.options = $.proxy(settings, lity, _defaultOptions);
  lity.handlers = $.proxy(settings, lity, _defaultOptions.handlers);
  lity.current = currentInstance;

  $(document).on('click.lity', '[data-lity]', lity);

  return lity;
}));
// tooltipster.bundle.js
/**
 * tooltipster http://iamceege.github.io/tooltipster/
 * A rockin' custom tooltip jQuery plugin
 * Developed by Caleb Jacob and Louis Ameline
 * MIT license
 */
(function(root, factory) {
  if (typeof define === 'function' && define.amd) {
    // AMD. Register as an anonymous module unless amdModuleId is set
    define(["jquery"], function(a0) {
      return (factory(a0));
    });
  } else if (typeof exports === 'object') {
    // Node. Does not work with strict CommonJS, but
    // only CommonJS-like environments that support module.exports,
    // like Node.
    module.exports = factory(require("jquery"));
  } else {
    factory(jQuery);
  }
}(this, function($) {

  // This file will be UMDified by a build task.

  var defaults = {
      animation: 'fade',
      animationDuration: 350,
      content: null,
      contentAsHTML: false,
      contentCloning: false,
      debug: true,
      delay: 300,
      delayTouch: [300, 500],
      functionInit: null,
      functionBefore: null,
      functionReady: null,
      functionAfter: null,
      functionFormat: null,
      IEmin: 6,
      interactive: false,
      multiple: false,
      // must be 'body' for now, or an element positioned at (0, 0)
      // in the document, typically like the very top views of an app.
      parent: 'body',
      plugins: ['sideTip'],
      repositionOnScroll: false,
      restoration: 'none',
      selfDestruction: true,
      theme: [],
      timer: 0,
      trackerInterval: 500,
      trackOrigin: false,
      trackTooltip: false,
      trigger: 'hover',
      triggerClose: {
        click: false,
        mouseleave: false,
        originClick: false,
        scroll: false,
        tap: false,
        touchleave: false
      },
      triggerOpen: {
        click: false,
        mouseenter: false,
        tap: false,
        touchstart: false
      },
      updateAnimation: 'rotate',
      zIndex: 9999999
    },
    // we'll avoid using the 'window' global as a good practice but npm's
    // jquery@<2.1.0 package actually requires a 'window' global, so not sure
    // it's useful at all
    win = (typeof window != 'undefined') ? window : null,
    // env will be proxied by the core for plugins to have access its properties
    env = {
      // detect if this device can trigger touch events. Better have a false
      // positive (unused listeners, that's ok) than a false negative.
      // https://github.com/Modernizr/Modernizr/blob/master/feature-detects/touchevents.js
      // http://stackoverflow.com/questions/4817029/whats-the-best-way-to-detect-a-touch-screen-device-using-javascript
      hasTouchCapability: !!(
        win && ('ontouchstart' in win || (win.DocumentTouch && win.document instanceof win.DocumentTouch) || win.navigator.maxTouchPoints)
      ),
      hasTransitions: transitionSupport(),
      IE: false,
      // don't set manually, it will be updated by a build task after the manifest
      semVer: '4.1.6',
      window: win
    },
    core = function() {

      // core variables

      // the core emitters
      this.__$emitterPrivate = $({});
      this.__$emitterPublic = $({});
      this.__instancesLatestArr = [];
      // collects plugin constructors
      this.__plugins = {};
      // proxy env variables for plugins who might use them
      this._env = env;
    };

  // core methods
  core.prototype = {

    /**
     * A function to proxy the public methods of an object onto another
     *
     * @param {object} constructor The constructor to bridge
     * @param {object} obj The object that will get new methods (an instance or the core)
     * @param {string} pluginName A plugin name for the console log message
     * @return {core}
     * @private
     */
    __bridge: function(constructor, obj, pluginName) {

      // if it's not already bridged
      if (!obj[pluginName]) {

        var fn = function() {};
        fn.prototype = constructor;

        var pluginInstance = new fn();

        // the _init method has to exist in instance constructors but might be missing
        // in core constructors
        if (pluginInstance.__init) {
          pluginInstance.__init(obj);
        }

        $.each(constructor, function(methodName, fn) {

          // don't proxy "private" methods, only "protected" and public ones
          if (methodName.indexOf('__') != 0) {

            // if the method does not exist yet
            if (!obj[methodName]) {

              obj[methodName] = function() {
                return pluginInstance[methodName].apply(pluginInstance, Array.prototype.slice.apply(arguments));
              };

              // remember to which plugin this method corresponds (several plugins may
              // have methods of the same name, we need to be sure)
              obj[methodName].bridged = pluginInstance;
            } else if (defaults.debug) {

              console.log('The ' + methodName + ' method of the ' + pluginName + ' plugin conflicts with another plugin or native methods');
            }
          }
        });

        obj[pluginName] = pluginInstance;
      }

      return this;
    },

    /**
     * For mockup in Node env if need be, for testing purposes
     *
     * @return {core}
     * @private
     */
    __setWindow: function(window) {
      env.window = window;
      return this;
    },

    /**
     * Returns a ruler, a tool to help measure the size of a tooltip under
     * various settings. Meant for plugins
     *
     * @see Ruler
     * @return {object} A Ruler instance
     * @protected
     */
    _getRuler: function($tooltip) {
      return new Ruler($tooltip);
    },

    /**
     * For internal use by plugins, if needed
     *
     * @return {core}
     * @protected
     */
    _off: function() {
      this.__$emitterPrivate.off.apply(this.__$emitterPrivate, Array.prototype.slice.apply(arguments));
      return this;
    },

    /**
     * For internal use by plugins, if needed
     *
     * @return {core}
     * @protected
     */
    _on: function() {
      this.__$emitterPrivate.on.apply(this.__$emitterPrivate, Array.prototype.slice.apply(arguments));
      return this;
    },

    /**
     * For internal use by plugins, if needed
     *
     * @return {core}
     * @protected
     */
    _one: function() {
      this.__$emitterPrivate.one.apply(this.__$emitterPrivate, Array.prototype.slice.apply(arguments));
      return this;
    },

    /**
     * Returns (getter) or adds (setter) a plugin
     *
     * @param {string|object} plugin Provide a string (in the full form
     * "namespace.name") to use as as getter, an object to use as a setter
     * @return {object|core}
     * @protected
     */
    _plugin: function(plugin) {

      var self = this;

      // getter
      if (typeof plugin == 'string') {

        var pluginName = plugin,
          p = null;

        // if the namespace is provided, it's easy to search
        if (pluginName.indexOf('.') > 0) {
          p = self.__plugins[pluginName];
        }
        // otherwise, return the first name that matches
        else {
          $.each(self.__plugins, function(i, plugin) {

            if (plugin.name.substring(plugin.name.length - pluginName.length - 1) == '.' + pluginName) {
              p = plugin;
              return false;
            }
          });
        }

        return p;
      }
      // setter
      else {

        // force namespaces
        if (plugin.name.indexOf('.') < 0) {
          throw new Error('Plugins must be namespaced');
        }

        self.__plugins[plugin.name] = plugin;

        // if the plugin has core features
        if (plugin.core) {

          // bridge non-private methods onto the core to allow new core methods
          self.__bridge(plugin.core, self, plugin.name);
        }

        return this;
      }
    },

    /**
     * Trigger events on the core emitters
     *
     * @returns {core}
     * @protected
     */
    _trigger: function() {

      var args = Array.prototype.slice.apply(arguments);

      if (typeof args[0] == 'string') {
        args[0] = {
          type: args[0]
        };
      }

      // note: the order of emitters matters
      this.__$emitterPrivate.trigger.apply(this.__$emitterPrivate, args);
      this.__$emitterPublic.trigger.apply(this.__$emitterPublic, args);

      return this;
    },

    /**
     * Returns instances of all tooltips in the page or an a given element
     *
     * @param {string|HTML object collection} selector optional Use this
     * parameter to restrict the set of objects that will be inspected
     * for the retrieval of instances. By default, all instances in the
     * page are returned.
     * @return {array} An array of instance objects
     * @public
     */
    instances: function(selector) {

      var instances = [],
        sel = selector || '.tooltipstered';

      $(sel).each(function() {

        var $this = $(this),
          ns = $this.data('tooltipster-ns');

        if (ns) {

          $.each(ns, function(i, namespace) {
            instances.push($this.data(namespace));
          });
        }
      });

      return instances;
    },

    /**
     * Returns the Tooltipster objects generated by the last initializing call
     *
     * @return {array} An array of instance objects
     * @public
     */
    instancesLatest: function() {
      return this.__instancesLatestArr;
    },

    /**
     * For public use only, not to be used by plugins (use ::_off() instead)
     *
     * @return {core}
     * @public
     */
    off: function() {
      this.__$emitterPublic.off.apply(this.__$emitterPublic, Array.prototype.slice.apply(arguments));
      return this;
    },

    /**
     * For public use only, not to be used by plugins (use ::_on() instead)
     *
     * @return {core}
     * @public
     */
    on: function() {
      this.__$emitterPublic.on.apply(this.__$emitterPublic, Array.prototype.slice.apply(arguments));
      return this;
    },

    /**
     * For public use only, not to be used by plugins (use ::_one() instead)
     *
     * @return {core}
     * @public
     */
    one: function() {
      this.__$emitterPublic.one.apply(this.__$emitterPublic, Array.prototype.slice.apply(arguments));
      return this;
    },

    /**
     * Returns all HTML elements which have one or more tooltips
     *
     * @param {string} selector optional Use this to restrict the results
     * to the descendants of an element
     * @return {array} An array of HTML elements
     * @public
     */
    origins: function(selector) {

      var sel = selector ?
        selector + ' ' :
        '';

      return $(sel + '.tooltipstered').toArray();
    },

    /**
     * Change default options for all future instances
     *
     * @param {object} d The options that should be made defaults
     * @return {core}
     * @public
     */
    setDefaults: function(d) {
      $.extend(defaults, d);
      return this;
    },

    /**
     * For users to trigger their handlers on the public emitter
     *
     * @returns {core}
     * @public
     */
    triggerHandler: function() {
      this.__$emitterPublic.triggerHandler.apply(this.__$emitterPublic, Array.prototype.slice.apply(arguments));
      return this;
    }
  };

  // $.tooltipster will be used to call core methods
  $.tooltipster = new core();

  // the Tooltipster instance class (mind the capital T)
  $.Tooltipster = function(element, options) {

    // list of instance variables

    // stack of custom callbacks provided as parameters to API methods
    this.__callbacks = {
      close: [],
      open: []
    };
    // the schedule time of DOM removal
    this.__closingTime;
    // this will be the user content shown in the tooltip. A capital "C" is used
    // because there is also a method called content()
    this.__Content;
    // for the size tracker
    this.__contentBcr;
    // to disable the tooltip once the destruction has begun
    this.__destroyed = false;
    this.__destroying = false;
    // we can't emit directly on the instance because if a method with the same
    // name as the event exists, it will be called by jQuery. Se we use a plain
    // object as emitter. This emitter is for internal use by plugins,
    // if needed.
    this.__$emitterPrivate = $({});
    // this emitter is for the user to listen to events without risking to mess
    // with our internal listeners
    this.__$emitterPublic = $({});
    this.__enabled = true;
    // the reference to the gc interval
    this.__garbageCollector;
    // various position and size data recomputed before each repositioning
    this.__Geometry;
    // the tooltip position, saved after each repositioning by a plugin
    this.__lastPosition;
    // a unique namespace per instance
    this.__namespace = 'tooltipster-' + Math.round(Math.random() * 1000000);
    this.__options;
    // will be used to support origins in scrollable areas
    this.__$originParents;
    this.__pointerIsOverOrigin = false;
    // to remove themes if needed
    this.__previousThemes = [];
    // the state can be either: appearing, stable, disappearing, closed
    this.__state = 'closed';
    // timeout references
    this.__timeouts = {
      close: [],
      open: null
    };
    // store touch events to be able to detect emulated mouse events
    this.__touchEvents = [];
    // the reference to the tracker interval
    this.__tracker = null;
    // the element to which this tooltip is associated
    this._$origin;
    // this will be the tooltip element (jQuery wrapped HTML element).
    // It's the job of a plugin to create it and append it to the DOM
    this._$tooltip;

    // launch
    this.__init(element, options);
  };

  $.Tooltipster.prototype = {

    /**
     * @param origin
     * @param options
     * @private
     */
    __init: function(origin, options) {

      var self = this;

      self._$origin = $(origin);
      self.__options = $.extend(true, {}, defaults, options);

      // some options may need to be reformatted
      self.__optionsFormat();

      // don't run on old IE if asked no to
      if (!env.IE || env.IE >= self.__options.IEmin) {

        // note: the content is null (empty) by default and can stay that
        // way if the plugin remains initialized but not fed any content. The
        // tooltip will just not appear.

        // let's save the initial value of the title attribute for later
        // restoration if need be.
        var initialTitle = null;

        // it will already have been saved in case of multiple tooltips
        if (self._$origin.data('tooltipster-initialTitle') === undefined) {

          initialTitle = self._$origin.attr('title');

          // we do not want initialTitle to be "undefined" because
          // of how jQuery's .data() method works
          if (initialTitle === undefined) initialTitle = null;

          self._$origin.data('tooltipster-initialTitle', initialTitle);
        }

        // If content is provided in the options, it has precedence over the
        // title attribute.
        // Note: an empty string is considered content, only 'null' represents
        // the absence of content.
        // Also, an existing title="" attribute will result in an empty string
        // content
        if (self.__options.content !== null) {
          self.__contentSet(self.__options.content);
        } else {

          var selector = self._$origin.attr('data-tooltip-content'),
            $el;

          if (selector) {
            $el = $(selector);
          }

          if ($el && $el[0]) {
            self.__contentSet($el.first());
          } else {
            self.__contentSet(initialTitle);
          }
        }

        self._$origin
          // strip the title off of the element to prevent the default tooltips
          // from popping up
          .removeAttr('title')
          // to be able to find all instances on the page later (upon window
          // events in particular)
          .addClass('tooltipstered');

        // set listeners on the origin
        self.__prepareOrigin();

        // set the garbage collector
        self.__prepareGC();

        // init plugins
        $.each(self.__options.plugins, function(i, pluginName) {
          self._plug(pluginName);
        });

        // to detect swiping
        if (env.hasTouchCapability) {
          $('body').on('touchmove.' + self.__namespace + '-triggerOpen', function(event) {
            self._touchRecordEvent(event);
          });
        }

        self
        // prepare the tooltip when it gets created. This event must
        // be fired by a plugin
          ._on('created', function() {
            self.__prepareTooltip();
          })
          // save position information when it's sent by a plugin
          ._on('repositioned', function(e) {
            self.__lastPosition = e.position;
          });
      } else {
        self.__options.disabled = true;
      }
    },

    /**
     * Insert the content into the appropriate HTML element of the tooltip
     *
     * @returns {self}
     * @private
     */
    __contentInsert: function() {

      var self = this,
        $el = self._$tooltip.find('.tooltipster-content'),
        formattedContent = self.__Content,
        format = function(content) {
          formattedContent = content;
        };

      self._trigger({
        type: 'format',
        content: self.__Content,
        format: format
      });

      if (self.__options.functionFormat) {

        formattedContent = self.__options.functionFormat.call(
          self,
          self, {
            origin: self._$origin[0]
          },
          self.__Content
        );
      }

      if (typeof formattedContent === 'string' && !self.__options.contentAsHTML) {
        $el.text(formattedContent);
      } else {
        $el
          .empty()
          .append(formattedContent);
      }

      return self;
    },

    /**
     * Save the content, cloning it beforehand if need be
     *
     * @param content
     * @returns {self}
     * @private
     */
    __contentSet: function(content) {

      // clone if asked. Cloning the object makes sure that each instance has its
      // own version of the content (in case a same object were provided for several
      // instances)
      // reminder: typeof null === object
      if (content instanceof $ && this.__options.contentCloning) {
        content = content.clone(true);
      }

      this.__Content = content;

      this._trigger({
        type: 'updated',
        content: content
      });

      return this;
    },

    /**
     * Error message about a method call made after destruction
     *
     * @private
     */
    __destroyError: function() {
      throw new Error('This tooltip has been destroyed and cannot execute your method call.');
    },

    /**
     * Gather all information about dimensions and available space,
     * called before every repositioning
     *
     * @private
     * @returns {object}
     */
    __geometry: function() {

      var self = this,
        $target = self._$origin,
        originIsArea = self._$origin.is('area');

      // if this._$origin is a map area, the target we'll need
      // the dimensions of is actually the image using the map,
      // not the area itself
      if (originIsArea) {

        var mapName = self._$origin.parent().attr('name');

        $target = $('img[usemap="#' + mapName + '"]');
      }

      var bcr = $target[0].getBoundingClientRect(),
        $document = $(env.window.document),
        $window = $(env.window),
        $parent = $target,
        // some useful properties of important elements
        geo = {
          // available space for the tooltip, see down below
          available: {
            document: null,
            window: null
          },
          document: {
            size: {
              height: $document.height(),
              width: $document.width()
            }
          },
          window: {
            scroll: {
              // the second ones are for IE compatibility
              left: env.window.scrollX || env.window.document.documentElement.scrollLeft,
              top: env.window.scrollY || env.window.document.documentElement.scrollTop
            },
            size: {
              height: $window.height(),
              width: $window.width()
            }
          },
          origin: {
            // the origin has a fixed lineage if itself or one of its
            // ancestors has a fixed position
            fixedLineage: false,
            // relative to the document
            offset: {},
            size: {
              height: bcr.bottom - bcr.top,
              width: bcr.right - bcr.left
            },
            usemapImage: originIsArea ? $target[0] : null,
            // relative to the window
            windowOffset: {
              bottom: bcr.bottom,
              left: bcr.left,
              right: bcr.right,
              top: bcr.top
            }
          }
        },
        geoFixed = false;

      // if the element is a map area, some properties may need
      // to be recalculated
      if (originIsArea) {

        var shape = self._$origin.attr('shape'),
          coords = self._$origin.attr('coords');

        if (coords) {

          coords = coords.split(',');

          $.map(coords, function(val, i) {
            coords[i] = parseInt(val);
          });
        }

        // if the image itself is the area, nothing more to do
        if (shape != 'default') {

          switch (shape) {

            case 'circle':

              var circleCenterLeft = coords[0],
                circleCenterTop = coords[1],
                circleRadius = coords[2],
                areaTopOffset = circleCenterTop - circleRadius,
                areaLeftOffset = circleCenterLeft - circleRadius;

              geo.origin.size.height = circleRadius * 2;
              geo.origin.size.width = geo.origin.size.height;

              geo.origin.windowOffset.left += areaLeftOffset;
              geo.origin.windowOffset.top += areaTopOffset;

              break;

            case 'rect':

              var areaLeft = coords[0],
                areaTop = coords[1],
                areaRight = coords[2],
                areaBottom = coords[3];

              geo.origin.size.height = areaBottom - areaTop;
              geo.origin.size.width = areaRight - areaLeft;

              geo.origin.windowOffset.left += areaLeft;
              geo.origin.windowOffset.top += areaTop;

              break;

            case 'poly':

              var areaSmallestX = 0,
                areaSmallestY = 0,
                areaGreatestX = 0,
                areaGreatestY = 0,
                arrayAlternate = 'even';

              for (var i = 0; i < coords.length; i++) {

                var areaNumber = coords[i];

                if (arrayAlternate == 'even') {

                  if (areaNumber > areaGreatestX) {

                    areaGreatestX = areaNumber;

                    if (i === 0) {
                      areaSmallestX = areaGreatestX;
                    }
                  }

                  if (areaNumber < areaSmallestX) {
                    areaSmallestX = areaNumber;
                  }

                  arrayAlternate = 'odd';
                } else {
                  if (areaNumber > areaGreatestY) {

                    areaGreatestY = areaNumber;

                    if (i == 1) {
                      areaSmallestY = areaGreatestY;
                    }
                  }

                  if (areaNumber < areaSmallestY) {
                    areaSmallestY = areaNumber;
                  }

                  arrayAlternate = 'even';
                }
              }

              geo.origin.size.height = areaGreatestY - areaSmallestY;
              geo.origin.size.width = areaGreatestX - areaSmallestX;

              geo.origin.windowOffset.left += areaSmallestX;
              geo.origin.windowOffset.top += areaSmallestY;

              break;
          }
        }
      }

      // user callback through an event
      var edit = function(r) {
        geo.origin.size.height = r.height,
          geo.origin.windowOffset.left = r.left,
          geo.origin.windowOffset.top = r.top,
          geo.origin.size.width = r.width
      };

      self._trigger({
        type: 'geometry',
        edit: edit,
        geometry: {
          height: geo.origin.size.height,
          left: geo.origin.windowOffset.left,
          top: geo.origin.windowOffset.top,
          width: geo.origin.size.width
        }
      });

      // calculate the remaining properties with what we got

      geo.origin.windowOffset.right = geo.origin.windowOffset.left + geo.origin.size.width;
      geo.origin.windowOffset.bottom = geo.origin.windowOffset.top + geo.origin.size.height;

      geo.origin.offset.left = geo.origin.windowOffset.left + geo.window.scroll.left;
      geo.origin.offset.top = geo.origin.windowOffset.top + geo.window.scroll.top;
      geo.origin.offset.bottom = geo.origin.offset.top + geo.origin.size.height;
      geo.origin.offset.right = geo.origin.offset.left + geo.origin.size.width;

      // the space that is available to display the tooltip relatively to the document
      geo.available.document = {
        bottom: {
          height: geo.document.size.height - geo.origin.offset.bottom,
          width: geo.document.size.width
        },
        left: {
          height: geo.document.size.height,
          width: geo.origin.offset.left
        },
        right: {
          height: geo.document.size.height,
          width: geo.document.size.width - geo.origin.offset.right
        },
        top: {
          height: geo.origin.offset.top,
          width: geo.document.size.width
        }
      };

      // the space that is available to display the tooltip relatively to the viewport
      // (the resulting values may be negative if the origin overflows the viewport)
      geo.available.window = {
        bottom: {
          // the inner max is here to make sure the available height is no bigger
          // than the viewport height (when the origin is off screen at the top).
          // The outer max just makes sure that the height is not negative (when
          // the origin overflows at the bottom).
          height: Math.max(geo.window.size.height - Math.max(geo.origin.windowOffset.bottom, 0), 0),
          width: geo.window.size.width
        },
        left: {
          height: geo.window.size.height,
          width: Math.max(geo.origin.windowOffset.left, 0)
        },
        right: {
          height: geo.window.size.height,
          width: Math.max(geo.window.size.width - Math.max(geo.origin.windowOffset.right, 0), 0)
        },
        top: {
          height: Math.max(geo.origin.windowOffset.top, 0),
          width: geo.window.size.width
        }
      };

      while ($parent[0].tagName.toLowerCase() != 'html') {

        if ($parent.css('position') == 'fixed') {
          geo.origin.fixedLineage = true;
          break;
        }

        $parent = $parent.parent();
      }

      return geo;
    },

    /**
     * Some options may need to be formated before being used
     *
     * @returns {self}
     * @private
     */
    __optionsFormat: function() {

      if (typeof this.__options.animationDuration == 'number') {
        this.__options.animationDuration = [this.__options.animationDuration, this.__options.animationDuration];
      }

      if (typeof this.__options.delay == 'number') {
        this.__options.delay = [this.__options.delay, this.__options.delay];
      }

      if (typeof this.__options.delayTouch == 'number') {
        this.__options.delayTouch = [this.__options.delayTouch, this.__options.delayTouch];
      }

      if (typeof this.__options.theme == 'string') {
        this.__options.theme = [this.__options.theme];
      }

      // determine the future parent
      if (typeof this.__options.parent == 'string') {
        this.__options.parent = $(this.__options.parent);
      }

      if (this.__options.trigger == 'hover') {

        this.__options.triggerOpen = {
          mouseenter: true,
          touchstart: true
        };

        this.__options.triggerClose = {
          mouseleave: true,
          originClick: true,
          touchleave: true
        };
      } else if (this.__options.trigger == 'click') {

        this.__options.triggerOpen = {
          click: true,
          tap: true
        };

        this.__options.triggerClose = {
          click: true,
          tap: true
        };
      }

      // for the plugins
      this._trigger('options');

      return this;
    },

    /**
     * Schedules or cancels the garbage collector task
     *
     * @returns {self}
     * @private
     */
    __prepareGC: function() {

      var self = this;

      // in case the selfDestruction option has been changed by a method call
      if (self.__options.selfDestruction) {

        // the GC task
        self.__garbageCollector = setInterval(function() {

          var now = new Date().getTime();

          // forget the old events
          self.__touchEvents = $.grep(self.__touchEvents, function(event, i) {
            // 1 minute
            return now - event.time > 60000;
          });

          // auto-destruct if the origin is gone
          if (!bodyContains(self._$origin)) {
            self.destroy();
          }
        }, 20000);
      } else {
        clearInterval(self.__garbageCollector);
      }

      return self;
    },

    /**
     * Sets listeners on the origin if the open triggers require them.
     * Unlike the listeners set at opening time, these ones
     * remain even when the tooltip is closed. It has been made a
     * separate method so it can be called when the triggers are
     * changed in the options. Closing is handled in _open()
     * because of the bindings that may be needed on the tooltip
     * itself
     *
     * @returns {self}
     * @private
     */
    __prepareOrigin: function() {

      var self = this;

      // in case we're resetting the triggers
      self._$origin.off('.' + self.__namespace + '-triggerOpen');

      // if the device is touch capable, even if only mouse triggers
      // are asked, we need to listen to touch events to know if the mouse
      // events are actually emulated (so we can ignore them)
      if (env.hasTouchCapability) {

        self._$origin.on(
          'touchstart.' + self.__namespace + '-triggerOpen ' +
          'touchend.' + self.__namespace + '-triggerOpen ' +
          'touchcancel.' + self.__namespace + '-triggerOpen',
          function(event) {
            self._touchRecordEvent(event);
          }
        );
      }

      // mouse click and touch tap work the same way
      if (self.__options.triggerOpen.click || (self.__options.triggerOpen.tap && env.hasTouchCapability)) {

        var eventNames = '';
        if (self.__options.triggerOpen.click) {
          eventNames += 'click.' + self.__namespace + '-triggerOpen ';
        }
        if (self.__options.triggerOpen.tap && env.hasTouchCapability) {
          eventNames += 'touchend.' + self.__namespace + '-triggerOpen';
        }

        self._$origin.on(eventNames, function(event) {
          if (self._touchIsMeaningfulEvent(event)) {
            self._open(event);
          }
        });
      }

      // mouseenter and touch start work the same way
      if (self.__options.triggerOpen.mouseenter || (self.__options.triggerOpen.touchstart && env.hasTouchCapability)) {

        var eventNames = '';
        if (self.__options.triggerOpen.mouseenter) {
          eventNames += 'mouseenter.' + self.__namespace + '-triggerOpen ';
        }
        if (self.__options.triggerOpen.touchstart && env.hasTouchCapability) {
          eventNames += 'touchstart.' + self.__namespace + '-triggerOpen';
        }

        self._$origin.on(eventNames, function(event) {
          if (self._touchIsTouchEvent(event) || !self._touchIsEmulatedEvent(event)) {
            self.__pointerIsOverOrigin = true;
            self._openShortly(event);
          }
        });
      }

      // info for the mouseleave/touchleave close triggers when they use a delay
      if (self.__options.triggerClose.mouseleave || (self.__options.triggerClose.touchleave && env.hasTouchCapability)) {

        var eventNames = '';
        if (self.__options.triggerClose.mouseleave) {
          eventNames += 'mouseleave.' + self.__namespace + '-triggerOpen ';
        }
        if (self.__options.triggerClose.touchleave && env.hasTouchCapability) {
          eventNames += 'touchend.' + self.__namespace + '-triggerOpen touchcancel.' + self.__namespace + '-triggerOpen';
        }

        self._$origin.on(eventNames, function(event) {

          if (self._touchIsMeaningfulEvent(event)) {
            self.__pointerIsOverOrigin = false;
          }
        });
      }

      return self;
    },

    /**
     * Do the things that need to be done only once after the tooltip
     * HTML element it has been created. It has been made a separate
     * method so it can be called when options are changed. Remember
     * that the tooltip may actually exist in the DOM before it is
     * opened, and present after it has been closed: it's the display
     * plugin that takes care of handling it.
     *
     * @returns {self}
     * @private
     */
    __prepareTooltip: function() {

      var self = this,
        p = self.__options.interactive ? 'auto' : '';

      // this will be useful to know quickly if the tooltip is in
      // the DOM or not
      self._$tooltip
        .attr('id', self.__namespace)
        .css({
          // pointer events
          'pointer-events': p,
          zIndex: self.__options.zIndex
        });

      // themes
      // remove the old ones and add the new ones
      $.each(self.__previousThemes, function(i, theme) {
        self._$tooltip.removeClass(theme);
      });
      $.each(self.__options.theme, function(i, theme) {
        self._$tooltip.addClass(theme);
      });

      self.__previousThemes = $.merge([], self.__options.theme);

      return self;
    },

    /**
     * Handles the scroll on any of the parents of the origin (when the
     * tooltip is open)
     *
     * @param {object} event
     * @returns {self}
     * @private
     */
    __scrollHandler: function(event) {

      var self = this;

      if (self.__options.triggerClose.scroll) {
        self._close(event);
      } else {

        // if the scroll happened on the window
        if (event.target === env.window.document) {

          // if the origin has a fixed lineage, window scroll will have no
          // effect on its position nor on the position of the tooltip
          if (!self.__Geometry.origin.fixedLineage) {

            // we don't need to do anything unless repositionOnScroll is true
            // because the tooltip will already have moved with the window
            // (and of course with the origin)
            if (self.__options.repositionOnScroll) {
              self.reposition(event);
            }
          }
        }
        // if the scroll happened on another parent of the tooltip, it means
        // that it's in a scrollable area and now needs to have its position
        // adjusted or recomputed, depending ont the repositionOnScroll
        // option. Also, if the origin is partly hidden due to a parent that
        // hides its overflow, we'll just hide (not close) the tooltip.
        else {

          var g = self.__geometry(),
            overflows = false;

          // a fixed position origin is not affected by the overflow hiding
          // of a parent
          if (self._$origin.css('position') != 'fixed') {

            self.__$originParents.each(function(i, el) {

              var $el = $(el),
                overflowX = $el.css('overflow-x'),
                overflowY = $el.css('overflow-y');

              if (overflowX != 'visible' || overflowY != 'visible') {

                var bcr = el.getBoundingClientRect();

                if (overflowX != 'visible') {

                  if (g.origin.windowOffset.left < bcr.left || g.origin.windowOffset.right > bcr.right) {
                    overflows = true;
                    return false;
                  }
                }

                if (overflowY != 'visible') {

                  if (g.origin.windowOffset.top < bcr.top || g.origin.windowOffset.bottom > bcr.bottom) {
                    overflows = true;
                    return false;
                  }
                }
              }

              // no need to go further if fixed, for the same reason as above
              if ($el.css('position') == 'fixed') {
                return false;
              }
            });
          }

          if (overflows) {
            self._$tooltip.css('visibility', 'hidden');
          } else {
            self._$tooltip.css('visibility', 'visible');

            // reposition
            if (self.__options.repositionOnScroll) {
              self.reposition(event);
            }
            // or just adjust offset
            else {

              // we have to use offset and not windowOffset because this way,
              // only the scroll distance of the scrollable areas are taken into
              // account (the scrolltop value of the main window must be
              // ignored since the tooltip already moves with it)
              var offsetLeft = g.origin.offset.left - self.__Geometry.origin.offset.left,
                offsetTop = g.origin.offset.top - self.__Geometry.origin.offset.top;

              // add the offset to the position initially computed by the display plugin
              self._$tooltip.css({
                left: self.__lastPosition.coord.left + offsetLeft,
                top: self.__lastPosition.coord.top + offsetTop
              });
            }
          }
        }

        self._trigger({
          type: 'scroll',
          event: event
        });
      }

      return self;
    },

    /**
     * Changes the state of the tooltip
     *
     * @param {string} state
     * @returns {self}
     * @private
     */
    __stateSet: function(state) {

      this.__state = state;

      this._trigger({
        type: 'state',
        state: state
      });

      return this;
    },

    /**
     * Clear appearance timeouts
     *
     * @returns {self}
     * @private
     */
    __timeoutsClear: function() {

      // there is only one possible open timeout: the delayed opening
      // when the mouseenter/touchstart open triggers are used
      clearTimeout(this.__timeouts.open);
      this.__timeouts.open = null;

      // ... but several close timeouts: the delayed closing when the
      // mouseleave close trigger is used and the timer option
      $.each(this.__timeouts.close, function(i, timeout) {
        clearTimeout(timeout);
      });
      this.__timeouts.close = [];

      return this;
    },

    /**
     * Start the tracker that will make checks at regular intervals
     *
     * @returns {self}
     * @private
     */
    __trackerStart: function() {

      var self = this,
        $content = self._$tooltip.find('.tooltipster-content');

      // get the initial content size
      if (self.__options.trackTooltip) {
        self.__contentBcr = $content[0].getBoundingClientRect();
      }

      self.__tracker = setInterval(function() {

        // if the origin or tooltip elements have been removed.
        // Note: we could destroy the instance now if the origin has
        // been removed but we'll leave that task to our garbage collector
        if (!bodyContains(self._$origin) || !bodyContains(self._$tooltip)) {
          self._close();
        }
        // if everything is alright
        else {

          // compare the former and current positions of the origin to reposition
          // the tooltip if need be
          if (self.__options.trackOrigin) {

            var g = self.__geometry(),
              identical = false;

            // compare size first (a change requires repositioning too)
            if (areEqual(g.origin.size, self.__Geometry.origin.size)) {

              // for elements that have a fixed lineage (see __geometry()), we track the
              // top and left properties (relative to window)
              if (self.__Geometry.origin.fixedLineage) {
                if (areEqual(g.origin.windowOffset, self.__Geometry.origin.windowOffset)) {
                  identical = true;
                }
              }
              // otherwise, track total offset (relative to document)
              else {
                if (areEqual(g.origin.offset, self.__Geometry.origin.offset)) {
                  identical = true;
                }
              }
            }

            if (!identical) {

              // close the tooltip when using the mouseleave close trigger
              // (see https://github.com/iamceege/tooltipster/pull/253)
              if (self.__options.triggerClose.mouseleave) {
                self._close();
              } else {
                self.reposition();
              }
            }
          }

          if (self.__options.trackTooltip) {

            var currentBcr = $content[0].getBoundingClientRect();

            if (currentBcr.height !== self.__contentBcr.height || currentBcr.width !== self.__contentBcr.width) {
              self.reposition();
              self.__contentBcr = currentBcr;
            }
          }
        }
      }, self.__options.trackerInterval);

      return self;
    },

    /**
     * Closes the tooltip (after the closing delay)
     *
     * @param event
     * @param callback
     * @returns {self}
     * @protected
     */
    _close: function(event, callback) {

      var self = this,
        ok = true;

      self._trigger({
        type: 'close',
        event: event,
        stop: function() {
          ok = false;
        }
      });

      // a destroying tooltip may not refuse to close
      if (ok || self.__destroying) {

        // save the method custom callback and cancel any open method custom callbacks
        if (callback) self.__callbacks.close.push(callback);
        self.__callbacks.open = [];

        // clear open/close timeouts
        self.__timeoutsClear();

        var finishCallbacks = function() {

          // trigger any close method custom callbacks and reset them
          $.each(self.__callbacks.close, function(i, c) {
            c.call(self, self, {
              event: event,
              origin: self._$origin[0]
            });
          });

          self.__callbacks.close = [];
        };

        if (self.__state != 'closed') {

          var necessary = true,
            d = new Date(),
            now = d.getTime(),
            newClosingTime = now + self.__options.animationDuration[1];

          // the tooltip may already already be disappearing, but if a new
          // call to close() is made after the animationDuration was changed
          // to 0 (for example), we ought to actually close it sooner than
          // previously scheduled. In that case it should be noted that the
          // browser will not adapt the animation duration to the new
          // animationDuration that was set after the start of the closing
          // animation.
          // Note: the same thing could be considered at opening, but is not
          // really useful since the tooltip is actually opened immediately
          // upon a call to _open(). Since it would not make the opening
          // animation finish sooner, its sole impact would be to trigger the
          // state event and the open callbacks sooner than the actual end of
          // the opening animation, which is not great.
          if (self.__state == 'disappearing') {

            if (newClosingTime > self.__closingTime) {
              necessary = false;
            }
          }

          if (necessary) {

            self.__closingTime = newClosingTime;

            if (self.__state != 'disappearing') {
              self.__stateSet('disappearing');
            }

            var finish = function() {

              // stop the tracker
              clearInterval(self.__tracker);

              // a "beforeClose" option has been asked several times but would
              // probably useless since the content element is still accessible
              // via ::content(), and because people can always use listeners
              // inside their content to track what's going on. For the sake of
              // simplicity, this has been denied. Bur for the rare people who
              // really need the option (for old browsers or for the case where
              // detaching the content is actually destructive, for file or
              // password inputs for example), this event will do the work.
              self._trigger({
                type: 'closing',
                event: event
              });

              // unbind listeners which are no longer needed

              self._$tooltip
                .off('.' + self.__namespace + '-triggerClose')
                .removeClass('tooltipster-dying');

              // orientationchange, scroll and resize listeners
              $(env.window).off('.' + self.__namespace + '-triggerClose');

              // scroll listeners
              self.__$originParents.each(function(i, el) {
                $(el).off('scroll.' + self.__namespace + '-triggerClose');
              });
              // clear the array to prevent memory leaks
              self.__$originParents = null;

              $('body').off('.' + self.__namespace + '-triggerClose');

              self._$origin.off('.' + self.__namespace + '-triggerClose');

              self._off('dismissable');

              // a plugin that would like to remove the tooltip from the
              // DOM when closed should bind on this
              self.__stateSet('closed');

              // trigger event
              self._trigger({
                type: 'after',
                event: event
              });

              // call our constructor custom callback function
              if (self.__options.functionAfter) {
                self.__options.functionAfter.call(self, self, {
                  event: event,
                  origin: self._$origin[0]
                });
              }

              // call our method custom callbacks functions
              finishCallbacks();
            };

            if (env.hasTransitions) {

              self._$tooltip.css({
                '-moz-animation-duration': self.__options.animationDuration[1] + 'ms',
                '-ms-animation-duration': self.__options.animationDuration[1] + 'ms',
                '-o-animation-duration': self.__options.animationDuration[1] + 'ms',
                '-webkit-animation-duration': self.__options.animationDuration[1] + 'ms',
                'animation-duration': self.__options.animationDuration[1] + 'ms',
                'transition-duration': self.__options.animationDuration[1] + 'ms'
              });

              self._$tooltip
                // clear both potential open and close tasks
                .clearQueue()
                .removeClass('tooltipster-show')
                // for transitions only
                .addClass('tooltipster-dying');

              if (self.__options.animationDuration[1] > 0) {
                self._$tooltip.delay(self.__options.animationDuration[1]);
              }

              self._$tooltip.queue(finish);
            } else {

              self._$tooltip
                .stop()
                .fadeOut(self.__options.animationDuration[1], finish);
            }
          }
        }
        // if the tooltip is already closed, we still need to trigger
        // the method custom callbacks
        else {
          finishCallbacks();
        }
      }

      return self;
    },

    /**
     * For internal use by plugins, if needed
     *
     * @returns {self}
     * @protected
     */
    _off: function() {
      this.__$emitterPrivate.off.apply(this.__$emitterPrivate, Array.prototype.slice.apply(arguments));
      return this;
    },

    /**
     * For internal use by plugins, if needed
     *
     * @returns {self}
     * @protected
     */
    _on: function() {
      this.__$emitterPrivate.on.apply(this.__$emitterPrivate, Array.prototype.slice.apply(arguments));
      return this;
    },

    /**
     * For internal use by plugins, if needed
     *
     * @returns {self}
     * @protected
     */
    _one: function() {
      this.__$emitterPrivate.one.apply(this.__$emitterPrivate, Array.prototype.slice.apply(arguments));
      return this;
    },

    /**
     * Opens the tooltip right away
     *
     * @param event
     * @param callback
     * @returns {self}
     * @protected
     */
    _open: function(event, callback) {

      var self = this;

      // if the destruction process has not begun and if this was not
      // triggered by an unwanted emulated click event
      if (!self.__destroying) {

        // check that the origin is still in the DOM
        if (bodyContains(self._$origin)
          // if the tooltip is enabled
          && self.__enabled
        ) {

          var ok = true;

          // if the tooltip is not open yet, we need to call functionBefore.
          // otherwise we can jst go on
          if (self.__state == 'closed') {

            // trigger an event. The event.stop function allows the callback
            // to prevent the opening of the tooltip
            self._trigger({
              type: 'before',
              event: event,
              stop: function() {
                ok = false;
              }
            });

            if (ok && self.__options.functionBefore) {

              // call our custom function before continuing
              ok = self.__options.functionBefore.call(self, self, {
                event: event,
                origin: self._$origin[0]
              });
            }
          }

          if (ok !== false) {

            // if there is some content
            if (self.__Content !== null) {

              // save the method callback and cancel close method callbacks
              if (callback) {
                self.__callbacks.open.push(callback);
              }
              self.__callbacks.close = [];

              // get rid of any appearance timeouts
              self.__timeoutsClear();

              var extraTime,
                finish = function() {

                  if (self.__state != 'stable') {
                    self.__stateSet('stable');
                  }

                  // trigger any open method custom callbacks and reset them
                  $.each(self.__callbacks.open, function(i, c) {
                    c.call(self, self, {
                      origin: self._$origin[0],
                      tooltip: self._$tooltip[0]
                    });
                  });

                  self.__callbacks.open = [];
                };

              // if the tooltip is already open
              if (self.__state !== 'closed') {

                // the timer (if any) will start (or restart) right now
                extraTime = 0;

                // if it was disappearing, cancel that
                if (self.__state === 'disappearing') {

                  self.__stateSet('appearing');

                  if (env.hasTransitions) {

                    self._$tooltip
                      .clearQueue()
                      .removeClass('tooltipster-dying')
                      .addClass('tooltipster-show');

                    if (self.__options.animationDuration[0] > 0) {
                      self._$tooltip.delay(self.__options.animationDuration[0]);
                    }

                    self._$tooltip.queue(finish);
                  } else {
                    // in case the tooltip was currently fading out, bring it back
                    // to life
                    self._$tooltip
                      .stop()
                      .fadeIn(finish);
                  }
                }
                // if the tooltip is already open, we still need to trigger the method
                // custom callback
                else if (self.__state == 'stable') {
                  finish();
                }
              }
              // if the tooltip isn't already open, open it
              else {

                // a plugin must bind on this and store the tooltip in this._$tooltip
                self.__stateSet('appearing');

                // the timer (if any) will start when the tooltip has fully appeared
                // after its transition
                extraTime = self.__options.animationDuration[0];

                // insert the content inside the tooltip
                self.__contentInsert();

                // reposition the tooltip and attach to the DOM
                self.reposition(event, true);

                // animate in the tooltip. If the display plugin wants no css
                // animations, it may override the animation option with a
                // dummy value that will produce no effect
                if (env.hasTransitions) {

                  // note: there seems to be an issue with start animations which
                  // are randomly not played on fast devices in both Chrome and FF,
                  // couldn't find a way to solve it yet. It seems that applying
                  // the classes before appending to the DOM helps a little, but
                  // it messes up some CSS transitions. The issue almost never
                  // happens when delay[0]==0 though
                  self._$tooltip
                    .addClass('tooltipster-' + self.__options.animation)
                    .addClass('tooltipster-initial')
                    .css({
                      '-moz-animation-duration': self.__options.animationDuration[0] + 'ms',
                      '-ms-animation-duration': self.__options.animationDuration[0] + 'ms',
                      '-o-animation-duration': self.__options.animationDuration[0] + 'ms',
                      '-webkit-animation-duration': self.__options.animationDuration[0] + 'ms',
                      'animation-duration': self.__options.animationDuration[0] + 'ms',
                      'transition-duration': self.__options.animationDuration[0] + 'ms'
                    });

                  setTimeout(
                    function() {

                      // a quick hover may have already triggered a mouseleave
                      if (self.__state != 'closed') {

                        self._$tooltip
                          .addClass('tooltipster-show')
                          .removeClass('tooltipster-initial');

                        if (self.__options.animationDuration[0] > 0) {
                          self._$tooltip.delay(self.__options.animationDuration[0]);
                        }

                        self._$tooltip.queue(finish);
                      }
                    },
                    0
                  );
                } else {

                  // old browsers will have to live with this
                  self._$tooltip
                    .css('display', 'none')
                    .fadeIn(self.__options.animationDuration[0], finish);
                }

                // checks if the origin is removed while the tooltip is open
                self.__trackerStart();

                // NOTE: the listeners below have a '-triggerClose' namespace
                // because we'll remove them when the tooltip closes (unlike
                // the '-triggerOpen' listeners). So some of them are actually
                // not about close triggers, rather about positioning.

                $(env.window)
                  // reposition on resize
                  .on('resize.' + self.__namespace + '-triggerClose', function(e) {

                    var $ae = $(document.activeElement);

                    // reposition only if the resize event was not triggered upon the opening
                    // of a virtual keyboard due to an input field being focused within the tooltip
                    // (otherwise the repositioning would lose the focus)
                    if ((!$ae.is('input') && !$ae.is('textarea')) || !$.contains(self._$tooltip[0], $ae[0])) {
                      self.reposition(e);
                    }
                  })
                  // same as below for parents
                  .on('scroll.' + self.__namespace + '-triggerClose', function(e) {
                    self.__scrollHandler(e);
                  });

                self.__$originParents = self._$origin.parents();

                // scrolling may require the tooltip to be moved or even
                // repositioned in some cases
                self.__$originParents.each(function(i, parent) {

                  $(parent).on('scroll.' + self.__namespace + '-triggerClose', function(e) {
                    self.__scrollHandler(e);
                  });
                });

                if (self.__options.triggerClose.mouseleave || (self.__options.triggerClose.touchleave && env.hasTouchCapability)) {

                  // we use an event to allow users/plugins to control when the mouseleave/touchleave
                  // close triggers will come to action. It allows to have more triggering elements
                  // than just the origin and the tooltip for example, or to cancel/delay the closing,
                  // or to make the tooltip interactive even if it wasn't when it was open, etc.
                  self._on('dismissable', function(event) {

                    if (event.dismissable) {

                      if (event.delay) {

                        timeout = setTimeout(function() {
                          // event.event may be undefined
                          self._close(event.event);
                        }, event.delay);

                        self.__timeouts.close.push(timeout);
                      } else {
                        self._close(event);
                      }
                    } else {
                      clearTimeout(timeout);
                    }
                  });

                  // now set the listeners that will trigger 'dismissable' events
                  var $elements = self._$origin,
                    eventNamesIn = '',
                    eventNamesOut = '',
                    timeout = null;

                  // if we have to allow interaction, bind on the tooltip too
                  if (self.__options.interactive) {
                    $elements = $elements.add(self._$tooltip);
                  }

                  if (self.__options.triggerClose.mouseleave) {
                    eventNamesIn += 'mouseenter.' + self.__namespace + '-triggerClose ';
                    eventNamesOut += 'mouseleave.' + self.__namespace + '-triggerClose ';
                  }
                  if (self.__options.triggerClose.touchleave && env.hasTouchCapability) {
                    eventNamesIn += 'touchstart.' + self.__namespace + '-triggerClose';
                    eventNamesOut += 'touchend.' + self.__namespace + '-triggerClose touchcancel.' + self.__namespace + '-triggerClose';
                  }

                  $elements
                  // close after some time spent outside of the elements
                    .on(eventNamesOut, function(event) {

                      // it's ok if the touch gesture ended up to be a swipe,
                      // it's still a "touch leave" situation
                      if (self._touchIsTouchEvent(event) || !self._touchIsEmulatedEvent(event)) {

                        var delay = (event.type == 'mouseleave') ?
                          self.__options.delay :
                          self.__options.delayTouch;

                        self._trigger({
                          delay: delay[1],
                          dismissable: true,
                          event: event,
                          type: 'dismissable'
                        });
                      }
                    })
                    // suspend the mouseleave timeout when the pointer comes back
                    // over the elements
                    .on(eventNamesIn, function(event) {

                      // it's also ok if the touch event is a swipe gesture
                      if (self._touchIsTouchEvent(event) || !self._touchIsEmulatedEvent(event)) {
                        self._trigger({
                          dismissable: false,
                          event: event,
                          type: 'dismissable'
                        });
                      }
                    });
                }

                // close the tooltip when the origin gets a mouse click (common behavior of
                // native tooltips)
                if (self.__options.triggerClose.originClick) {

                  self._$origin.on('click.' + self.__namespace + '-triggerClose', function(event) {

                    // we could actually let a tap trigger this but this feature just
                    // does not make sense on touch devices
                    if (!self._touchIsTouchEvent(event) && !self._touchIsEmulatedEvent(event)) {
                      self._close(event);
                    }
                  });
                }

                // set the same bindings for click and touch on the body to close the tooltip
                if (self.__options.triggerClose.click || (self.__options.triggerClose.tap && env.hasTouchCapability)) {

                  // don't set right away since the click/tap event which triggered this method
                  // (if it was a click/tap) is going to bubble up to the body, we don't want it
                  // to close the tooltip immediately after it opened
                  setTimeout(function() {

                    if (self.__state != 'closed') {

                      var eventNames = '';
                      if (self.__options.triggerClose.click) {
                        eventNames += 'click.' + self.__namespace + '-triggerClose ';
                      }
                      if (self.__options.triggerClose.tap && env.hasTouchCapability) {
                        eventNames += 'touchend.' + self.__namespace + '-triggerClose';
                      }

                      $('body').on(eventNames, function(event) {

                        if (self._touchIsMeaningfulEvent(event)) {

                          self._touchRecordEvent(event);

                          if (!self.__options.interactive || !$.contains(self._$tooltip[0], event.target)) {
                            self._close(event);
                          }
                        }
                      });

                      // needed to detect and ignore swiping
                      if (self.__options.triggerClose.tap && env.hasTouchCapability) {

                        $('body').on('touchstart.' + self.__namespace + '-triggerClose', function(event) {
                          self._touchRecordEvent(event);
                        });
                      }
                    }
                  }, 0);
                }

                self._trigger('ready');

                // call our custom callback
                if (self.__options.functionReady) {
                  self.__options.functionReady.call(self, self, {
                    origin: self._$origin[0],
                    tooltip: self._$tooltip[0]
                  });
                }
              }

              // if we have a timer set, let the countdown begin
              if (self.__options.timer > 0) {

                var timeout = setTimeout(function() {
                  self._close();
                }, self.__options.timer + extraTime);

                self.__timeouts.close.push(timeout);
              }
            }
          }
        }
      }

      return self;
    },

    /**
     * When using the mouseenter/touchstart open triggers, this function will
     * schedule the opening of the tooltip after the delay, if there is one
     *
     * @param event
     * @returns {self}
     * @protected
     */
    _openShortly: function(event) {

      var self = this,
        ok = true;

      if (self.__state != 'stable' && self.__state != 'appearing') {

        // if a timeout is not already running
        if (!self.__timeouts.open) {

          self._trigger({
            type: 'start',
            event: event,
            stop: function() {
              ok = false;
            }
          });

          if (ok) {

            var delay = (event.type.indexOf('touch') == 0) ?
              self.__options.delayTouch :
              self.__options.delay;

            if (delay[0]) {

              self.__timeouts.open = setTimeout(function() {

                self.__timeouts.open = null;

                // open only if the pointer (mouse or touch) is still over the origin.
                // The check on the "meaningful event" can only be made here, after some
                // time has passed (to know if the touch was a swipe or not)
                if (self.__pointerIsOverOrigin && self._touchIsMeaningfulEvent(event)) {

                  // signal that we go on
                  self._trigger('startend');

                  self._open(event);
                } else {
                  // signal that we cancel
                  self._trigger('startcancel');
                }
              }, delay[0]);
            } else {
              // signal that we go on
              self._trigger('startend');

              self._open(event);
            }
          }
        }
      }

      return self;
    },

    /**
     * Meant for plugins to get their options
     *
     * @param {string} pluginName The name of the plugin that asks for its options
     * @param {object} defaultOptions The default options of the plugin
     * @returns {object} The options
     * @protected
     */
    _optionsExtract: function(pluginName, defaultOptions) {

      var self = this,
        options = $.extend(true, {}, defaultOptions);

      // if the plugin options were isolated in a property named after the
      // plugin, use them (prevents conflicts with other plugins)
      var pluginOptions = self.__options[pluginName];

      // if not, try to get them as regular options
      if (!pluginOptions) {

        pluginOptions = {};

        $.each(defaultOptions, function(optionName, value) {

          var o = self.__options[optionName];

          if (o !== undefined) {
            pluginOptions[optionName] = o;
          }
        });
      }

      // let's merge the default options and the ones that were provided. We'd want
      // to do a deep copy but not let jQuery merge arrays, so we'll do a shallow
      // extend on two levels, that will be enough if options are not more than 1
      // level deep
      $.each(options, function(optionName, value) {

        if (pluginOptions[optionName] !== undefined) {

          if ((typeof value == 'object' && !(value instanceof Array) && value != null) &&
            (typeof pluginOptions[optionName] == 'object' && !(pluginOptions[optionName] instanceof Array) && pluginOptions[optionName] != null)
          ) {
            $.extend(options[optionName], pluginOptions[optionName]);
          } else {
            options[optionName] = pluginOptions[optionName];
          }
        }
      });

      return options;
    },

    /**
     * Used at instantiation of the plugin, or afterwards by plugins that activate themselves
     * on existing instances
     *
     * @param {object} pluginName
     * @returns {self}
     * @protected
     */
    _plug: function(pluginName) {

      var plugin = $.tooltipster._plugin(pluginName);

      if (plugin) {

        // if there is a constructor for instances
        if (plugin.instance) {

          // proxy non-private methods on the instance to allow new instance methods
          $.tooltipster.__bridge(plugin.instance, this, plugin.name);
        }
      } else {
        throw new Error('The "' + pluginName + '" plugin is not defined');
      }

      return this;
    },

    /**
     * This will return true if the event is a mouse event which was
     * emulated by the browser after a touch event. This allows us to
     * really dissociate mouse and touch triggers.
     *
     * There is a margin of error if a real mouse event is fired right
     * after (within the delay shown below) a touch event on the same
     * element, but hopefully it should not happen often.
     *
     * @returns {boolean}
     * @protected
     */
    _touchIsEmulatedEvent: function(event) {

      var isEmulated = false,
        now = new Date().getTime();

      for (var i = this.__touchEvents.length - 1; i >= 0; i--) {

        var e = this.__touchEvents[i];

        // delay, in milliseconds. It's supposed to be 300ms in
        // most browsers (350ms on iOS) to allow a double tap but
        // can be less (check out FastClick for more info)
        if (now - e.time < 500) {

          if (e.target === event.target) {
            isEmulated = true;
          }
        } else {
          break;
        }
      }

      return isEmulated;
    },

    /**
     * Returns false if the event was an emulated mouse event or
     * a touch event involved in a swipe gesture.
     *
     * @param {object} event
     * @returns {boolean}
     * @protected
     */
    _touchIsMeaningfulEvent: function(event) {
      return (
        (this._touchIsTouchEvent(event) && !this._touchSwiped(event.target)) || (!this._touchIsTouchEvent(event) && !this._touchIsEmulatedEvent(event))
      );
    },

    /**
     * Checks if an event is a touch event
     *
     * @param {object} event
     * @returns {boolean}
     * @protected
     */
    _touchIsTouchEvent: function(event) {
      return event.type.indexOf('touch') == 0;
    },

    /**
     * Store touch events for a while to detect swiping and emulated mouse events
     *
     * @param {object} event
     * @returns {self}
     * @protected
     */
    _touchRecordEvent: function(event) {

      if (this._touchIsTouchEvent(event)) {
        event.time = new Date().getTime();
        this.__touchEvents.push(event);
      }

      return this;
    },

    /**
     * Returns true if a swipe happened after the last touchstart event fired on
     * event.target.
     *
     * We need to differentiate a swipe from a tap before we let the event open
     * or close the tooltip. A swipe is when a touchmove (scroll) event happens
     * on the body between the touchstart and the touchend events of an element.
     *
     * @param {object} target The HTML element that may have triggered the swipe
     * @returns {boolean}
     * @protected
     */
    _touchSwiped: function(target) {

      var swiped = false;

      for (var i = this.__touchEvents.length - 1; i >= 0; i--) {

        var e = this.__touchEvents[i];

        if (e.type == 'touchmove') {
          swiped = true;
          break;
        } else if (
          e.type == 'touchstart' && target === e.target
        ) {
          break;
        }
      }

      return swiped;
    },

    /**
     * Triggers an event on the instance emitters
     *
     * @returns {self}
     * @protected
     */
    _trigger: function() {

      var args = Array.prototype.slice.apply(arguments);

      if (typeof args[0] == 'string') {
        args[0] = {
          type: args[0]
        };
      }

      // add properties to the event
      args[0].instance = this;
      args[0].origin = this._$origin ? this._$origin[0] : null;
      args[0].tooltip = this._$tooltip ? this._$tooltip[0] : null;

      // note: the order of emitters matters
      this.__$emitterPrivate.trigger.apply(this.__$emitterPrivate, args);
      $.tooltipster._trigger.apply($.tooltipster, args);
      this.__$emitterPublic.trigger.apply(this.__$emitterPublic, args);

      return this;
    },

    /**
     * Deactivate a plugin on this instance
     *
     * @returns {self}
     * @protected
     */
    _unplug: function(pluginName) {

      var self = this;

      // if the plugin has been activated on this instance
      if (self[pluginName]) {

        var plugin = $.tooltipster._plugin(pluginName);

        // if there is a constructor for instances
        if (plugin.instance) {

          // unbridge
          $.each(plugin.instance, function(methodName, fn) {

            // if the method exists (privates methods do not) and comes indeed from
            // this plugin (may be missing or come from a conflicting plugin).
            if (self[methodName] && self[methodName].bridged === self[pluginName]) {
              delete self[methodName];
            }
          });
        }

        // destroy the plugin
        if (self[pluginName].__destroy) {
          self[pluginName].__destroy();
        }

        // remove the reference to the plugin instance
        delete self[pluginName];
      }

      return self;
    },

    /**
     * @see self::_close
     * @returns {self}
     * @public
     */
    close: function(callback) {

      if (!this.__destroyed) {
        this._close(null, callback);
      } else {
        this.__destroyError();
      }

      return this;
    },

    /**
     * Sets or gets the content of the tooltip
     *
     * @returns {mixed|self}
     * @public
     */
    content: function(content) {

      var self = this;

      // getter method
      if (content === undefined) {
        return self.__Content;
      }
      // setter method
      else {

        if (!self.__destroyed) {

          // change the content
          self.__contentSet(content);

          if (self.__Content !== null) {

            // update the tooltip if it is open
            if (self.__state !== 'closed') {

              // reset the content in the tooltip
              self.__contentInsert();

              // reposition and resize the tooltip
              self.reposition();

              // if we want to play a little animation showing the content changed
              if (self.__options.updateAnimation) {

                if (env.hasTransitions) {

                  // keep the reference in the local scope
                  var animation = self.__options.updateAnimation;

                  self._$tooltip.addClass('tooltipster-update-' + animation);

                  // remove the class after a while. The actual duration of the
                  // update animation may be shorter, it's set in the CSS rules
                  setTimeout(function() {

                    if (self.__state != 'closed') {

                      self._$tooltip.removeClass('tooltipster-update-' + animation);
                    }
                  }, 1000);
                } else {
                  self._$tooltip.fadeTo(200, 0.5, function() {
                    if (self.__state != 'closed') {
                      self._$tooltip.fadeTo(200, 1);
                    }
                  });
                }
              }
            }
          } else {
            self._close();
          }
        } else {
          self.__destroyError();
        }

        return self;
      }
    },

    /**
     * Destroys the tooltip
     *
     * @returns {self}
     * @public
     */
    destroy: function() {

      var self = this;

      if (!self.__destroyed) {

        if (!self.__destroying) {

          self.__destroying = true;

          self._close(null, function() {

            self._trigger('destroy');

            self.__destroying = false;
            self.__destroyed = true;

            self._$origin
              .removeData(self.__namespace)
              // remove the open trigger listeners
              .off('.' + self.__namespace + '-triggerOpen');

            // remove the touch listener
            $('body').off('.' + self.__namespace + '-triggerOpen');

            var ns = self._$origin.data('tooltipster-ns');

            // if the origin has been removed from DOM, its data may
            // well have been destroyed in the process and there would
            // be nothing to clean up or restore
            if (ns) {

              // if there are no more tooltips on this element
              if (ns.length === 1) {

                // optional restoration of a title attribute
                var title = null;
                if (self.__options.restoration == 'previous') {
                  title = self._$origin.data('tooltipster-initialTitle');
                } else if (self.__options.restoration == 'current') {

                  // old school technique to stringify when outerHTML is not supported
                  title = (typeof self.__Content == 'string') ?
                    self.__Content :
                    $('<div></div>').append(self.__Content).html();
                }

                if (title) {
                  self._$origin.attr('title', title);
                }

                // final cleaning

                self._$origin.removeClass('tooltipstered');

                self._$origin
                  .removeData('tooltipster-ns')
                  .removeData('tooltipster-initialTitle');
              } else {
                // remove the instance namespace from the list of namespaces of
                // tooltips present on the element
                ns = $.grep(ns, function(el, i) {
                  return el !== self.__namespace;
                });
                self._$origin.data('tooltipster-ns', ns);
              }
            }

            // last event
            self._trigger('destroyed');

            // unbind private and public event listeners
            self._off();
            self.off();

            // remove external references, just in case
            self.__Content = null;
            self.__$emitterPrivate = null;
            self.__$emitterPublic = null;
            self.__options.parent = null;
            self._$origin = null;
            self._$tooltip = null;

            // make sure the object is no longer referenced in there to prevent
            // memory leaks
            $.tooltipster.__instancesLatestArr = $.grep($.tooltipster.__instancesLatestArr, function(el, i) {
              return self !== el;
            });

            clearInterval(self.__garbageCollector);
          });
        }
      } else {
        self.__destroyError();
      }

      // we return the scope rather than true so that the call to
      // .tooltipster('destroy') actually returns the matched elements
      // and applies to all of them
      return self;
    },

    /**
     * Disables the tooltip
     *
     * @returns {self}
     * @public
     */
    disable: function() {

      if (!this.__destroyed) {

        // close first, in case the tooltip would not disappear on
        // its own (no close trigger)
        this._close();
        this.__enabled = false;

        return this;
      } else {
        this.__destroyError();
      }

      return this;
    },

    /**
     * Returns the HTML element of the origin
     *
     * @returns {self}
     * @public
     */
    elementOrigin: function() {

      if (!this.__destroyed) {
        return this._$origin[0];
      } else {
        this.__destroyError();
      }
    },

    /**
     * Returns the HTML element of the tooltip
     *
     * @returns {self}
     * @public
     */
    elementTooltip: function() {
      return this._$tooltip ? this._$tooltip[0] : null;
    },

    /**
     * Enables the tooltip
     *
     * @returns {self}
     * @public
     */
    enable: function() {
      this.__enabled = true;
      return this;
    },

    /**
     * Alias, deprecated in 4.0.0
     *
     * @param {function} callback
     * @returns {self}
     * @public
     */
    hide: function(callback) {
      return this.close(callback);
    },

    /**
     * Returns the instance
     *
     * @returns {self}
     * @public
     */
    instance: function() {
      return this;
    },

    /**
     * For public use only, not to be used by plugins (use ::_off() instead)
     *
     * @returns {self}
     * @public
     */
    off: function() {

      if (!this.__destroyed) {
        this.__$emitterPublic.off.apply(this.__$emitterPublic, Array.prototype.slice.apply(arguments));
      }

      return this;
    },

    /**
     * For public use only, not to be used by plugins (use ::_on() instead)
     *
     * @returns {self}
     * @public
     */
    on: function() {

      if (!this.__destroyed) {
        this.__$emitterPublic.on.apply(this.__$emitterPublic, Array.prototype.slice.apply(arguments));
      } else {
        this.__destroyError();
      }

      return this;
    },

    /**
     * For public use only, not to be used by plugins
     *
     * @returns {self}
     * @public
     */
    one: function() {

      if (!this.__destroyed) {
        this.__$emitterPublic.one.apply(this.__$emitterPublic, Array.prototype.slice.apply(arguments));
      } else {
        this.__destroyError();
      }

      return this;
    },

    /**
     * @see self::_open
     * @returns {self}
     * @public
     */
    open: function(callback) {

      if (!this.__destroyed && !this.__destroying) {
        this._open(null, callback);
      } else {
        this.__destroyError();
      }

      return this;
    },

    /**
     * Get or set options. For internal use and advanced users only.
     *
     * @param {string} o Option name
     * @param {mixed} val optional A new value for the option
     * @return {mixed|self} If val is omitted, the value of the option
     * is returned, otherwise the instance itself is returned
     * @public
     */
    option: function(o, val) {

      // getter
      if (val === undefined) {
        return this.__options[o];
      }
      // setter
      else {

        if (!this.__destroyed) {

          // change value
          this.__options[o] = val;

          // format
          this.__optionsFormat();

          // re-prepare the triggers if needed
          if ($.inArray(o, ['trigger', 'triggerClose', 'triggerOpen']) >= 0) {
            this.__prepareOrigin();
          }

          if (o === 'selfDestruction') {
            this.__prepareGC();
          }
        } else {
          this.__destroyError();
        }

        return this;
      }
    },

    /**
     * This method is in charge of setting the position and size properties of the tooltip.
     * All the hard work is delegated to the display plugin.
     * Note: The tooltip may be detached from the DOM at the moment the method is called
     * but must be attached by the end of the method call.
     *
     * @param {object} event For internal use only. Defined if an event such as
     * window resizing triggered the repositioning
     * @param {boolean} tooltipIsDetached For internal use only. Set this to true if you
     * know that the tooltip not being in the DOM is not an issue (typically when the
     * tooltip element has just been created but has not been added to the DOM yet).
     * @returns {self}
     * @public
     */
    reposition: function(event, tooltipIsDetached) {

      var self = this;

      if (!self.__destroyed) {

        // if the tooltip is still open and the origin is still in the DOM
        if (self.__state != 'closed' && bodyContains(self._$origin)) {

          // if the tooltip has not been removed from DOM manually (or if it
          // has been detached on purpose)
          if (tooltipIsDetached || bodyContains(self._$tooltip)) {

            if (!tooltipIsDetached) {
              // detach in case the tooltip overflows the window and adds
              // scrollbars to it, so __geometry can be accurate
              self._$tooltip.detach();
            }

            // refresh the geometry object before passing it as a helper
            self.__Geometry = self.__geometry();

            // let a plugin fo the rest
            self._trigger({
              type: 'reposition',
              event: event,
              helper: {
                geo: self.__Geometry
              }
            });
          }
        }
      } else {
        self.__destroyError();
      }

      return self;
    },

    /**
     * Alias, deprecated in 4.0.0
     *
     * @param callback
     * @returns {self}
     * @public
     */
    show: function(callback) {
      return this.open(callback);
    },

    /**
     * Returns some properties about the instance
     *
     * @returns {object}
     * @public
     */
    status: function() {

      return {
        destroyed: this.__destroyed,
        destroying: this.__destroying,
        enabled: this.__enabled,
        open: this.__state !== 'closed',
        state: this.__state
      };
    },

    /**
     * For public use only, not to be used by plugins
     *
     * @returns {self}
     * @public
     */
    triggerHandler: function() {

      if (!this.__destroyed) {
        this.__$emitterPublic.triggerHandler.apply(this.__$emitterPublic, Array.prototype.slice.apply(arguments));
      } else {
        this.__destroyError();
      }

      return this;
    }
  };

  $.fn.tooltipster = function() {

    // for using in closures
    var args = Array.prototype.slice.apply(arguments),
      // common mistake: an HTML element can't be in several tooltips at the same time
      contentCloningWarning = 'You are using a single HTML element as content for several tooltips. You probably want to set the contentCloning option to TRUE.';

    // this happens with $(sel).tooltipster(...) when $(sel) does not match anything
    if (this.length === 0) {

      // still chainable
      return this;
    }
    // this happens when calling $(sel).tooltipster('methodName or options')
    // where $(sel) matches one or more elements
    else {

      // method calls
      if (typeof args[0] === 'string') {

        var v = '#*$~&';

        this.each(function() {

          // retrieve the namepaces of the tooltip(s) that exist on that element.
          // We will interact with the first tooltip only.
          var ns = $(this).data('tooltipster-ns'),
            // self represents the instance of the first tooltipster plugin
            // associated to the current HTML object of the loop
            self = ns ? $(this).data(ns[0]) : null;

          // if the current element holds a tooltipster instance
          if (self) {

            if (typeof self[args[0]] === 'function') {

              if (this.length > 1 && args[0] == 'content' && (args[1] instanceof $ || (typeof args[1] == 'object' && args[1] != null && args[1].tagName)) && !self.__options.contentCloning && self.__options.debug) {
                console.log(contentCloningWarning);
              }

              // note : args[1] and args[2] may not be defined
              var resp = self[args[0]](args[1], args[2]);
            } else {
              throw new Error('Unknown method "' + args[0] + '"');
            }

            // if the function returned anything other than the instance
            // itself (which implies chaining, except for the `instance` method)
            if (resp !== self || args[0] === 'instance') {

              v = resp;

              // return false to stop .each iteration on the first element
              // matched by the selector
              return false;
            }
          } else {
            throw new Error('You called Tooltipster\'s "' + args[0] + '" method on an uninitialized element');
          }
        });

        return (v !== '#*$~&') ? v : this;
      }
      // first argument is undefined or an object: the tooltip is initializing
      else {

        // reset the array of last initialized objects
        $.tooltipster.__instancesLatestArr = [];

        // is there a defined value for the multiple option in the options object ?
        var multipleIsSet = args[0] && args[0].multiple !== undefined,
          // if the multiple option is set to true, or if it's not defined but
          // set to true in the defaults
          multiple = (multipleIsSet && args[0].multiple) || (!multipleIsSet && defaults.multiple),
          // same for content
          contentIsSet = args[0] && args[0].content !== undefined,
          content = (contentIsSet && args[0].content) || (!contentIsSet && defaults.content),
          // same for contentCloning
          contentCloningIsSet = args[0] && args[0].contentCloning !== undefined,
          contentCloning =
          (contentCloningIsSet && args[0].contentCloning) || (!contentCloningIsSet && defaults.contentCloning),
          // same for debug
          debugIsSet = args[0] && args[0].debug !== undefined,
          debug = (debugIsSet && args[0].debug) || (!debugIsSet && defaults.debug);

        if (this.length > 1 && (content instanceof $ || (typeof content == 'object' && content != null && content.tagName)) && !contentCloning && debug) {
          console.log(contentCloningWarning);
        }

        // create a tooltipster instance for each element if it doesn't
        // already have one or if the multiple option is set, and attach the
        // object to it
        this.each(function() {

          var go = false,
            $this = $(this),
            ns = $this.data('tooltipster-ns'),
            obj = null;

          if (!ns) {
            go = true;
          } else if (multiple) {
            go = true;
          } else if (debug) {
            console.log('Tooltipster: one or more tooltips are already attached to the element below. Ignoring.');
            console.log(this);
          }

          if (go) {
            obj = new $.Tooltipster(this, args[0]);

            // save the reference of the new instance
            if (!ns) ns = [];
            ns.push(obj.__namespace);
            $this.data('tooltipster-ns', ns);

            // save the instance itself
            $this.data(obj.__namespace, obj);

            // call our constructor custom function.
            // we do this here and not in ::init() because we wanted
            // the object to be saved in $this.data before triggering
            // it
            if (obj.__options.functionInit) {
              obj.__options.functionInit.call(obj, obj, {
                origin: this
              });
            }

            // and now the event, for the plugins and core emitter
            obj._trigger('init');
          }

          $.tooltipster.__instancesLatestArr.push(obj);
        });

        return this;
      }
    }
  };

  // Utilities

  /**
   * A class to check if a tooltip can fit in given dimensions
   *
   * @param {object} $tooltip The jQuery wrapped tooltip element, or a clone of it
   */
  function Ruler($tooltip) {

    // list of instance variables

    this.$container;
    this.constraints = null;
    this.__$tooltip;

    this.__init($tooltip);
  }

  Ruler.prototype = {

    /**
     * Move the tooltip into an invisible div that does not allow overflow to make
     * size tests. Note: the tooltip may or may not be attached to the DOM at the
     * moment this method is called, it does not matter.
     *
     * @param {object} $tooltip The object to test. May be just a clone of the
     * actual tooltip.
     * @private
     */
    __init: function($tooltip) {

      this.__$tooltip = $tooltip;

      this.__$tooltip
        .css({
          // for some reason we have to specify top and left 0
          left: 0,
          // any overflow will be ignored while measuring
          overflow: 'hidden',
          // positions at (0,0) without the div using 100% of the available width
          position: 'absolute',
          top: 0
        })
        // overflow must be auto during the test. We re-set this in case
        // it were modified by the user
        .find('.tooltipster-content')
        .css('overflow', 'auto');

      this.$container = $('<div class="tooltipster-ruler"></div>')
        .append(this.__$tooltip)
        .appendTo('body');
    },

    /**
     * Force the browser to redraw (re-render) the tooltip immediately. This is required
     * when you changed some CSS properties and need to make something with it
     * immediately, without waiting for the browser to redraw at the end of instructions.
     *
     * @see http://stackoverflow.com/questions/3485365/how-can-i-force-webkit-to-redraw-repaint-to-propagate-style-changes
     * @private
     */
    __forceRedraw: function() {

      // note: this would work but for Webkit only
      //this.__$tooltip.close();
      //this.__$tooltip[0].offsetHeight;
      //this.__$tooltip.open();

      // works in FF too
      var $p = this.__$tooltip.parent();
      this.__$tooltip.detach();
      this.__$tooltip.appendTo($p);
    },

    /**
     * Set maximum dimensions for the tooltip. A call to ::measure afterwards
     * will tell us if the content overflows or if it's ok
     *
     * @param {int} width
     * @param {int} height
     * @return {Ruler}
     * @public
     */
    constrain: function(width, height) {

      this.constraints = {
        width: width,
        height: height
      };

      this.__$tooltip.css({
        // we disable display:flex, otherwise the content would overflow without
        // creating horizontal scrolling (which we need to detect).
        display: 'block',
        // reset any previous height
        height: '',
        // we'll check if horizontal scrolling occurs
        overflow: 'auto',
        // we'll set the width and see what height is generated and if there
        // is horizontal overflow
        width: width
      });

      return this;
    },

    /**
     * Reset the tooltip content overflow and remove the test container
     *
     * @returns {Ruler}
     * @public
     */
    destroy: function() {

      // in case the element was not a clone
      this.__$tooltip
        .detach()
        .find('.tooltipster-content')
        .css({
          // reset to CSS value
          display: '',
          overflow: ''
        });

      this.$container.remove();
    },

    /**
     * Removes any constraints
     *
     * @returns {Ruler}
     * @public
     */
    free: function() {

      this.constraints = null;

      // reset to natural size
      this.__$tooltip.css({
        display: '',
        height: '',
        overflow: 'visible',
        width: ''
      });

      return this;
    },

    /**
     * Returns the size of the tooltip. When constraints are applied, also returns
     * whether the tooltip fits in the provided dimensions.
     * The idea is to see if the new height is small enough and if the content does
     * not overflow horizontally.
     *
     * @param {int} width
     * @param {int} height
     * @returns {object} An object with a bool `fits` property and a `size` property
     * @public
     */
    measure: function() {

      this.__forceRedraw();

      var tooltipBcr = this.__$tooltip[0].getBoundingClientRect(),
        result = {
          size: {
            // bcr.width/height are not defined in IE8- but in this
            // case, bcr.right/bottom will have the same value
            // except in iOS 8+ where tooltipBcr.bottom/right are wrong
            // after scrolling for reasons yet to be determined
            height: tooltipBcr.height || tooltipBcr.bottom,
            width: tooltipBcr.width || tooltipBcr.right
          }
        };

      if (this.constraints) {

        // note: we used to use offsetWidth instead of boundingRectClient but
        // it returned rounded values, causing issues with sub-pixel layouts.

        // note2: noticed that the bcrWidth of text content of a div was once
        // greater than the bcrWidth of its container by 1px, causing the final
        // tooltip box to be too small for its content. However, evaluating
        // their widths one against the other (below) surprisingly returned
        // equality. Happened only once in Chrome 48, was not able to reproduce
        // => just having fun with float position values...

        var $content = this.__$tooltip.find('.tooltipster-content'),
          height = this.__$tooltip.outerHeight(),
          contentBcr = $content[0].getBoundingClientRect(),
          fits = {
            height: height <= this.constraints.height,
            width: (
              // this condition accounts for min-width property that
              // may apply
              tooltipBcr.width <= this.constraints.width
              // the -1 is here because scrollWidth actually returns
              // a rounded value, and may be greater than bcr.width if
              // it was rounded up. This may cause an issue for contents
              // which actually really overflow  by 1px or so, but that
              // should be rare. Not sure how to solve this efficiently.
              // See http://blogs.msdn.com/b/ie/archive/2012/02/17/sub-pixel-rendering-and-the-css-object-model.aspx
              && contentBcr.width >= $content[0].scrollWidth - 1
            )
          };

        result.fits = fits.height && fits.width;
      }

      // old versions of IE get the width wrong for some reason and it causes
      // the text to be broken to a new line, so we round it up. If the width
      // is the width of the screen though, we can assume it is accurate.
      if (env.IE && env.IE <= 11 && result.size.width !== env.window.document.documentElement.clientWidth) {
        result.size.width = Math.ceil(result.size.width) + 1;
      }

      return result;
    }
  };

  // quick & dirty compare function, not bijective nor multidimensional
  function areEqual(a, b) {
    var same = true;
    $.each(a, function(i, _) {
      if (b[i] === undefined || a[i] !== b[i]) {
        same = false;
        return false;
      }
    });
    return same;
  }

  /**
   * A fast function to check if an element is still in the DOM. It
   * tries to use an id as ids are indexed by the browser, or falls
   * back to jQuery's `contains` method. May fail if two elements
   * have the same id, but so be it
   *
   * @param {object} $obj A jQuery-wrapped HTML element
   * @return {boolean}
   */
  function bodyContains($obj) {
    var id = $obj.attr('id'),
      el = id ? env.window.document.getElementById(id) : null;
    // must also check that the element with the id is the one we want
    return el ? el === $obj[0] : $.contains(env.window.document.body, $obj[0]);
  }

  // detect IE versions for dirty fixes
  var uA = navigator.userAgent.toLowerCase();
  if (uA.indexOf('msie') != -1) env.IE = parseInt(uA.split('msie')[1]);
  else if (uA.toLowerCase().indexOf('trident') !== -1 && uA.indexOf(' rv:11') !== -1) env.IE = 11;
  else if (uA.toLowerCase().indexOf('edge/') != -1) env.IE = parseInt(uA.toLowerCase().split('edge/')[1]);

  // detecting support for CSS transitions
  function transitionSupport() {

    // env.window is not defined yet when this is called
    if (!win) return false;

    var b = win.document.body || win.document.documentElement,
      s = b.style,
      p = 'transition',
      v = ['Moz', 'Webkit', 'Khtml', 'O', 'ms'];

    if (typeof s[p] == 'string') {
      return true;
    }

    p = p.charAt(0).toUpperCase() + p.substr(1);
    for (var i = 0; i < v.length; i++) {
      if (typeof s[v[i] + p] == 'string') {
        return true;
      }
    }
    return false;
  }

  // we'll return jQuery for plugins not to have to declare it as a dependency,
  // but it's done by a build task since it should be included only once at the
  // end when we concatenate the core file with a plugin
  // sideTip is Tooltipster's default plugin.
  // This file will be UMDified by a build task.

  var pluginName = 'tooltipster.sideTip';

  $.tooltipster._plugin({
    name: pluginName,
    instance: {
      /**
       * Defaults are provided as a function for an easy override by inheritance
       *
       * @return {object} An object with the defaults options
       * @private
       */
      __defaults: function() {

        return {
          // if the tooltip should display an arrow that points to the origin
          arrow: true,
          // the distance in pixels between the tooltip and the origin
          distance: 6,
          // allows to easily change the position of the tooltip
          functionPosition: null,
          maxWidth: null,
          // used to accomodate the arrow of tooltip if there is one.
          // First to make sure that the arrow target is not too close
          // to the edge of the tooltip, so the arrow does not overflow
          // the tooltip. Secondly when we reposition the tooltip to
          // make sure that it's positioned in such a way that the arrow is
          // still pointing at the target (and not a few pixels beyond it).
          // It should be equal to or greater than half the width of
          // the arrow (by width we mean the size of the side which touches
          // the side of the tooltip).
          minIntersection: 16,
          minWidth: 0,
          // deprecated in 4.0.0. Listed for _optionsExtract to pick it up
          position: null,
          side: 'top',
          // set to false to position the tooltip relatively to the document rather
          // than the window when we open it
          viewportAware: true
        };
      },

      /**
       * Run once: at instantiation of the plugin
       *
       * @param {object} instance The tooltipster object that instantiated this plugin
       * @private
       */
      __init: function(instance) {

        var self = this;

        // list of instance variables

        self.__instance = instance;
        self.__namespace = 'tooltipster-sideTip-' + Math.round(Math.random() * 1000000);
        self.__previousState = 'closed';
        self.__options;

        // initial formatting
        self.__optionsFormat();

        self.__instance._on('state.' + self.__namespace, function(event) {

          if (event.state == 'closed') {
            self.__close();
          } else if (event.state == 'appearing' && self.__previousState == 'closed') {
            self.__create();
          }

          self.__previousState = event.state;
        });

        // reformat every time the options are changed
        self.__instance._on('options.' + self.__namespace, function() {
          self.__optionsFormat();
        });

        self.__instance._on('reposition.' + self.__namespace, function(e) {
          self.__reposition(e.event, e.helper);
        });
      },

      /**
       * Called when the tooltip has closed
       *
       * @private
       */
      __close: function() {

        // detach our content object first, so the next jQuery's remove()
        // call does not unbind its event handlers
        if (this.__instance.content() instanceof $) {
          this.__instance.content().detach();
        }

        // remove the tooltip from the DOM
        this.__instance._$tooltip.remove();
        this.__instance._$tooltip = null;
      },

      /**
       * Creates the HTML element of the tooltip.
       *
       * @private
       */
      __create: function() {

        // note: we wrap with a .tooltipster-box div to be able to set a margin on it
        // (.tooltipster-base must not have one)
        var $html = $(
          '<div class="tooltipster-base tooltipster-sidetip">' +
          '<div class="tooltipster-box">' +
          '<div class="tooltipster-content"></div>' +
          '</div>' +
          '<div class="tooltipster-arrow">' +
          '<div class="tooltipster-arrow-uncropped">' +
          '<div class="tooltipster-arrow-border"></div>' +
          '<div class="tooltipster-arrow-background"></div>' +
          '</div>' +
          '</div>' +
          '</div>'
        );

        // hide arrow if asked
        if (!this.__options.arrow) {
          $html
            .find('.tooltipster-box')
            .css('margin', 0)
            .end()
            .find('.tooltipster-arrow')
            .hide();
        }

        // apply min/max width if asked
        if (this.__options.minWidth) {
          $html.css('min-width', this.__options.minWidth + 'px');
        }
        if (this.__options.maxWidth) {
          $html.css('max-width', this.__options.maxWidth + 'px');
        }

        this.__instance._$tooltip = $html;

        // tell the instance that the tooltip element has been created
        this.__instance._trigger('created');
      },

      /**
       * Used when the plugin is to be unplugged
       *
       * @private
       */
      __destroy: function() {
        this.__instance._off('.' + self.__namespace);
      },

      /**
       * (Re)compute this.__options from the options declared to the instance
       *
       * @private
       */
      __optionsFormat: function() {

        var self = this;

        // get the options
        self.__options = self.__instance._optionsExtract(pluginName, self.__defaults());

        // for backward compatibility, deprecated in v4.0.0
        if (self.__options.position) {
          self.__options.side = self.__options.position;
        }

        // options formatting

        // format distance as a four-cell array if it ain't one yet and then make
        // it an object with top/bottom/left/right properties
        if (typeof self.__options.distance != 'object') {
          self.__options.distance = [self.__options.distance];
        }
        if (self.__options.distance.length < 4) {

          if (self.__options.distance[1] === undefined) self.__options.distance[1] = self.__options.distance[0];
          if (self.__options.distance[2] === undefined) self.__options.distance[2] = self.__options.distance[0];
          if (self.__options.distance[3] === undefined) self.__options.distance[3] = self.__options.distance[1];

          self.__options.distance = {
            top: self.__options.distance[0],
            right: self.__options.distance[1],
            bottom: self.__options.distance[2],
            left: self.__options.distance[3]
          };
        }

        // let's transform:
        // 'top' into ['top', 'bottom', 'right', 'left']
        // 'right' into ['right', 'left', 'top', 'bottom']
        // 'bottom' into ['bottom', 'top', 'right', 'left']
        // 'left' into ['left', 'right', 'top', 'bottom']
        if (typeof self.__options.side == 'string') {

          var opposites = {
            'top': 'bottom',
            'right': 'left',
            'bottom': 'top',
            'left': 'right'
          };

          self.__options.side = [self.__options.side, opposites[self.__options.side]];

          if (self.__options.side[0] == 'left' || self.__options.side[0] == 'right') {
            self.__options.side.push('top', 'bottom');
          } else {
            self.__options.side.push('right', 'left');
          }
        }

        // misc
        // disable the arrow in IE6 unless the arrow option was explicitly set to true
        if ($.tooltipster._env.IE === 6 && self.__options.arrow !== true) {
          self.__options.arrow = false;
        }
      },

      /**
       * This method must compute and set the positioning properties of the
       * tooltip (left, top, width, height, etc.). It must also make sure the
       * tooltip is eventually appended to its parent (since the element may be
       * detached from the DOM at the moment the method is called).
       *
       * We'll evaluate positioning scenarios to find which side can contain the
       * tooltip in the best way. We'll consider things relatively to the window
       * (unless the user asks not to), then to the document (if need be, or if the
       * user explicitly requires the tests to run on the document). For each
       * scenario, measures are taken, allowing us to know how well the tooltip
       * is going to fit. After that, a sorting function will let us know what
       * the best scenario is (we also allow the user to choose his favorite
       * scenario by using an event).
       *
       * @param {object} helper An object that contains variables that plugin
       * creators may find useful (see below)
       * @param {object} helper.geo An object with many layout properties
       * about objects of interest (window, document, origin). This should help
       * plugin users compute the optimal position of the tooltip
       * @private
       */
      __reposition: function(event, helper) {

        var self = this,
          finalResult,
          // to know where to put the tooltip, we need to know on which point
          // of the x or y axis we should center it. That coordinate is the target
          targets = self.__targetFind(helper),
          testResults = [];

        // make sure the tooltip is detached while we make tests on a clone
        self.__instance._$tooltip.detach();

        // we could actually provide the original element to the Ruler and
        // not a clone, but it just feels right to keep it out of the
        // machinery.
        var $clone = self.__instance._$tooltip.clone(),
          // start position tests session
          ruler = $.tooltipster._getRuler($clone),
          satisfied = false,
          animation = self.__instance.option('animation');

        // an animation class could contain properties that distort the size
        if (animation) {
          $clone.removeClass('tooltipster-' + animation);
        }

        // start evaluating scenarios
        $.each(['window', 'document'], function(i, container) {

          var takeTest = null;

          // let the user decide to keep on testing or not
          self.__instance._trigger({
            container: container,
            helper: helper,
            satisfied: satisfied,
            takeTest: function(bool) {
              takeTest = bool;
            },
            results: testResults,
            type: 'positionTest'
          });

          if (takeTest == true || (takeTest != false && satisfied == false
              // skip the window scenarios if asked. If they are reintegrated by
              // the callback of the positionTest event, they will have to be
              // excluded using the callback of positionTested
              && (container != 'window' || self.__options.viewportAware)
            )) {

            // for each allowed side
            for (var i = 0; i < self.__options.side.length; i++) {

              var distance = {
                  horizontal: 0,
                  vertical: 0
                },
                side = self.__options.side[i];

              if (side == 'top' || side == 'bottom') {
                distance.vertical = self.__options.distance[side];
              } else {
                distance.horizontal = self.__options.distance[side];
              }

              // this may have an effect on the size of the tooltip if there are css
              // rules for the arrow or something else
              self.__sideChange($clone, side);

              $.each(['natural', 'constrained'], function(i, mode) {

                takeTest = null;

                // emit an event on the instance
                self.__instance._trigger({
                  container: container,
                  event: event,
                  helper: helper,
                  mode: mode,
                  results: testResults,
                  satisfied: satisfied,
                  side: side,
                  takeTest: function(bool) {
                    takeTest = bool;
                  },
                  type: 'positionTest'
                });

                if (takeTest == true || (takeTest != false && satisfied == false)) {

                  var testResult = {
                    container: container,
                    // we let the distance as an object here, it can make things a little easier
                    // during the user's calculations at positionTest/positionTested
                    distance: distance,
                    // whether the tooltip can fit in the size of the viewport (does not mean
                    // that we'll be able to make it initially entirely visible, see 'whole')
                    fits: null,
                    mode: mode,
                    outerSize: null,
                    side: side,
                    size: null,
                    target: targets[side],
                    // check if the origin has enough surface on screen for the tooltip to
                    // aim at it without overflowing the viewport (this is due to the thickness
                    // of the arrow represented by the minIntersection length).
                    // If not, the tooltip will have to be partly or entirely off screen in
                    // order to stay docked to the origin. This value will stay null when the
                    // container is the document, as it is not relevant
                    whole: null
                  };

                  // get the size of the tooltip with or without size constraints
                  var rulerConfigured = (mode == 'natural') ?
                    ruler.free() :
                    ruler.constrain(
                      helper.geo.available[container][side].width - distance.horizontal,
                      helper.geo.available[container][side].height - distance.vertical
                    ),
                    rulerResults = rulerConfigured.measure();

                  testResult.size = rulerResults.size;
                  testResult.outerSize = {
                    height: rulerResults.size.height + distance.vertical,
                    width: rulerResults.size.width + distance.horizontal
                  };

                  if (mode == 'natural') {

                    if (helper.geo.available[container][side].width >= testResult.outerSize.width && helper.geo.available[container][side].height >= testResult.outerSize.height) {
                      testResult.fits = true;
                    } else {
                      testResult.fits = false;
                    }
                  } else {
                    testResult.fits = rulerResults.fits;
                  }

                  if (container == 'window') {

                    if (!testResult.fits) {
                      testResult.whole = false;
                    } else {
                      if (side == 'top' || side == 'bottom') {

                        testResult.whole = (
                          helper.geo.origin.windowOffset.right >= self.__options.minIntersection && helper.geo.window.size.width - helper.geo.origin.windowOffset.left >= self.__options.minIntersection
                        );
                      } else {
                        testResult.whole = (
                          helper.geo.origin.windowOffset.bottom >= self.__options.minIntersection && helper.geo.window.size.height - helper.geo.origin.windowOffset.top >= self.__options.minIntersection
                        );
                      }
                    }
                  }

                  testResults.push(testResult);

                  // we don't need to compute more positions if we have one fully on screen
                  if (testResult.whole) {
                    satisfied = true;
                  } else {
                    // don't run the constrained test unless the natural width was greater
                    // than the available width, otherwise it's pointless as we know it
                    // wouldn't fit either
                    if (testResult.mode == 'natural' && (testResult.fits || testResult.size.width <= helper.geo.available[container][side].width)) {
                      return false;
                    }
                  }
                }
              });
            }
          }
        });

        // the user may eliminate the unwanted scenarios from testResults, but he's
        // not supposed to alter them at this point. functionPosition and the
        // position event serve that purpose.
        self.__instance._trigger({
          edit: function(r) {
            testResults = r;
          },
          event: event,
          helper: helper,
          results: testResults,
          type: 'positionTested'
        });

        /**
         * Sort the scenarios to find the favorite one.
         *
         * The favorite scenario is when we can fully display the tooltip on screen,
         * even if it means that the middle of the tooltip is no longer centered on
         * the middle of the origin (when the origin is near the edge of the screen
         * or even partly off screen). We want the tooltip on the preferred side,
         * even if it means that we have to use a constrained size rather than a
         * natural one (as long as it fits). When the origin is off screen at the top
         * the tooltip will be positioned at the bottom (if allowed), if the origin
         * is off screen on the right, it will be positioned on the left, etc.
         * If there are no scenarios where the tooltip can fit on screen, or if the
         * user does not want the tooltip to fit on screen (viewportAware == false),
         * we fall back to the scenarios relative to the document.
         *
         * When the tooltip is bigger than the viewport in either dimension, we stop
         * looking at the window scenarios and consider the document scenarios only,
         * with the same logic to find on which side it would fit best.
         *
         * If the tooltip cannot fit the document on any side, we force it at the
         * bottom, so at least the user can scroll to see it.
         */
        testResults.sort(function(a, b) {

          // best if it's whole (the tooltip fits and adapts to the viewport)
          if (a.whole && !b.whole) {
            return -1;
          } else if (!a.whole && b.whole) {
            return 1;
          } else if (a.whole && b.whole) {

            var ai = self.__options.side.indexOf(a.side),
              bi = self.__options.side.indexOf(b.side);

            // use the user's sides fallback array
            if (ai < bi) {
              return -1;
            } else if (ai > bi) {
              return 1;
            } else {
              // will be used if the user forced the tests to continue
              return a.mode == 'natural' ? -1 : 1;
            }
          } else {

            // better if it fits
            if (a.fits && !b.fits) {
              return -1;
            } else if (!a.fits && b.fits) {
              return 1;
            } else if (a.fits && b.fits) {

              var ai = self.__options.side.indexOf(a.side),
                bi = self.__options.side.indexOf(b.side);

              // use the user's sides fallback array
              if (ai < bi) {
                return -1;
              } else if (ai > bi) {
                return 1;
              } else {
                // will be used if the user forced the tests to continue
                return a.mode == 'natural' ? -1 : 1;
              }
            } else {

              // if everything failed, this will give a preference to the case where
              // the tooltip overflows the document at the bottom
              if (a.container == 'document' && a.side == 'bottom' && a.mode == 'natural') {
                return -1;
              } else {
                return 1;
              }
            }
          }
        });

        finalResult = testResults[0];


        // now let's find the coordinates of the tooltip relatively to the window
        finalResult.coord = {};

        switch (finalResult.side) {

          case 'left':
          case 'right':
            finalResult.coord.top = Math.floor(finalResult.target - finalResult.size.height / 2);
            break;

          case 'bottom':
          case 'top':
            finalResult.coord.left = Math.floor(finalResult.target - finalResult.size.width / 2);
            break;
        }

        switch (finalResult.side) {

          case 'left':
            finalResult.coord.left = helper.geo.origin.windowOffset.left - finalResult.outerSize.width;
            break;

          case 'right':
            finalResult.coord.left = helper.geo.origin.windowOffset.right + finalResult.distance.horizontal;
            break;

          case 'top':
            finalResult.coord.top = helper.geo.origin.windowOffset.top - finalResult.outerSize.height;
            break;

          case 'bottom':
            finalResult.coord.top = helper.geo.origin.windowOffset.bottom + finalResult.distance.vertical;
            break;
        }

        // if the tooltip can potentially be contained within the viewport dimensions
        // and that we are asked to make it fit on screen
        if (finalResult.container == 'window') {

          // if the tooltip overflows the viewport, we'll move it accordingly (then it will
          // not be centered on the middle of the origin anymore). We only move horizontally
          // for top and bottom tooltips and vice versa.
          if (finalResult.side == 'top' || finalResult.side == 'bottom') {

            // if there is an overflow on the left
            if (finalResult.coord.left < 0) {

              // prevent the overflow unless the origin itself gets off screen (minus the
              // margin needed to keep the arrow pointing at the target)
              if (helper.geo.origin.windowOffset.right - this.__options.minIntersection >= 0) {
                finalResult.coord.left = 0;
              } else {
                finalResult.coord.left = helper.geo.origin.windowOffset.right - this.__options.minIntersection - 1;
              }
            }
            // or an overflow on the right
            else if (finalResult.coord.left > helper.geo.window.size.width - finalResult.size.width) {

              if (helper.geo.origin.windowOffset.left + this.__options.minIntersection <= helper.geo.window.size.width) {
                finalResult.coord.left = helper.geo.window.size.width - finalResult.size.width;
              } else {
                finalResult.coord.left = helper.geo.origin.windowOffset.left + this.__options.minIntersection + 1 - finalResult.size.width;
              }
            }
          } else {

            // overflow at the top
            if (finalResult.coord.top < 0) {

              if (helper.geo.origin.windowOffset.bottom - this.__options.minIntersection >= 0) {
                finalResult.coord.top = 0;
              } else {
                finalResult.coord.top = helper.geo.origin.windowOffset.bottom - this.__options.minIntersection - 1;
              }
            }
            // or at the bottom
            else if (finalResult.coord.top > helper.geo.window.size.height - finalResult.size.height) {

              if (helper.geo.origin.windowOffset.top + this.__options.minIntersection <= helper.geo.window.size.height) {
                finalResult.coord.top = helper.geo.window.size.height - finalResult.size.height;
              } else {
                finalResult.coord.top = helper.geo.origin.windowOffset.top + this.__options.minIntersection + 1 - finalResult.size.height;
              }
            }
          }
        } else {

          // there might be overflow here too but it's easier to handle. If there has
          // to be an overflow, we'll make sure it's on the right side of the screen
          // (because the browser will extend the document size if there is an overflow
          // on the right, but not on the left). The sort function above has already
          // made sure that a bottom document overflow is preferred to a top overflow,
          // so we don't have to care about it.

          // if there is an overflow on the right
          if (finalResult.coord.left > helper.geo.window.size.width - finalResult.size.width) {

            // this may actually create on overflow on the left but we'll fix it in a sec
            finalResult.coord.left = helper.geo.window.size.width - finalResult.size.width;
          }

          // if there is an overflow on the left
          if (finalResult.coord.left < 0) {

            // don't care if it overflows the right after that, we made our best
            finalResult.coord.left = 0;
          }
        }


        // submit the positioning proposal to the user function which may choose to change
        // the side, size and/or the coordinates

        // first, set the rules that corresponds to the proposed side: it may change
        // the size of the tooltip, and the custom functionPosition may want to detect the
        // size of something before making a decision. So let's make things easier for the
        // implementor
        self.__sideChange($clone, finalResult.side);

        // add some variables to the helper
        helper.tooltipClone = $clone[0];
        helper.tooltipParent = self.__instance.option('parent').parent[0];
        // move informative values to the helper
        helper.mode = finalResult.mode;
        helper.whole = finalResult.whole;
        // add some variables to the helper for the functionPosition callback (these
        // will also be added to the event fired by self.__instance._trigger but that's
        // ok, we're just being consistent)
        helper.origin = self.__instance._$origin[0];
        helper.tooltip = self.__instance._$tooltip[0];

        // leave only the actionable values in there for functionPosition
        delete finalResult.container;
        delete finalResult.fits;
        delete finalResult.mode;
        delete finalResult.outerSize;
        delete finalResult.whole;

        // keep only the distance on the relevant side, for clarity
        finalResult.distance = finalResult.distance.horizontal || finalResult.distance.vertical;

        // beginners may not be comfortable with the concept of editing the object
        //  passed by reference, so we provide an edit function and pass a clone
        var finalResultClone = $.extend(true, {}, finalResult);

        // emit an event on the instance
        self.__instance._trigger({
          edit: function(result) {
            finalResult = result;
          },
          event: event,
          helper: helper,
          position: finalResultClone,
          type: 'position'
        });

        if (self.__options.functionPosition) {


          var result = self.__options.functionPosition.call(self, self.__instance, helper, finalResultClone);

          if (result) finalResult = result;
        }

        // end the positioning tests session (the user might have had a
        // use for it during the position event, now it's over)
        ruler.destroy();


        // compute the position of the target relatively to the tooltip root
        // element so we can place the arrow and make the needed adjustments
        var arrowCoord,
          maxVal;

        if (finalResult.side == 'top' || finalResult.side == 'bottom') {

          arrowCoord = {
            prop: 'left',
            val: finalResult.target - finalResult.coord.left
          };
          maxVal = finalResult.size.width - this.__options.minIntersection;
        } else {

          arrowCoord = {
            prop: 'top',
            val: finalResult.target - finalResult.coord.top
          };
          maxVal = finalResult.size.height - this.__options.minIntersection;
        }

        // cannot lie beyond the boundaries of the tooltip, minus the
        // arrow margin
        if (arrowCoord.val < this.__options.minIntersection) {
          arrowCoord.val = this.__options.minIntersection;
        } else if (arrowCoord.val > maxVal) {
          arrowCoord.val = maxVal;
        }

        var originParentOffset;

        // let's convert the window-relative coordinates into coordinates relative to the
        // future positioned parent that the tooltip will be appended to
        if (helper.geo.origin.fixedLineage) {

          // same as windowOffset when the position is fixed
          originParentOffset = helper.geo.origin.windowOffset;
        } else {

          // this assumes that the parent of the tooltip is located at
          // (0, 0) in the document, typically like when the parent is
          // <body>.
          // If we ever allow other types of parent, .tooltipster-ruler
          // will have to be appended to the parent to inherit css style
          // values that affect the display of the text and such.
          originParentOffset = {
            left: helper.geo.origin.windowOffset.left + helper.geo.window.scroll.left,
            top: helper.geo.origin.windowOffset.top + helper.geo.window.scroll.top
          };
        }

        finalResult.coord = {
          left: originParentOffset.left + (finalResult.coord.left - helper.geo.origin.windowOffset.left),
          top: originParentOffset.top + (finalResult.coord.top - helper.geo.origin.windowOffset.top)
        };

        // set position values on the original tooltip element

        self.__sideChange(self.__instance._$tooltip, finalResult.side);

        if (helper.geo.origin.fixedLineage) {
          self.__instance._$tooltip
            .css('position', 'fixed');
        } else {
          // CSS default
          self.__instance._$tooltip
            .css('position', '');
        }

        self.__instance._$tooltip
          .css({
            left: finalResult.coord.left,
            top: finalResult.coord.top,
            // we need to set a size even if the tooltip is in its natural size
            // because when the tooltip is positioned beyond the width of the body
            // (which is by default the width of the window; it will happen when
            // you scroll the window horizontally to get to the origin), its text
            // content will otherwise break lines at each word to keep up with the
            // body overflow strategy.
            height: finalResult.size.height,
            width: finalResult.size.width
          })
          .find('.tooltipster-arrow')
          .css({
            'left': '',
            'top': ''
          })
          .css(arrowCoord.prop, arrowCoord.val);

        // append the tooltip HTML element to its parent
        self.__instance._$tooltip.appendTo(self.__instance.option('parent'));

        self.__instance._trigger({
          type: 'repositioned',
          event: event,
          position: finalResult
        });
      },

      /**
       * Make whatever modifications are needed when the side is changed. This has
       * been made an independant method for easy inheritance in custom plugins based
       * on this default plugin.
       *
       * @param {object} $obj
       * @param {string} side
       * @private
       */
      __sideChange: function($obj, side) {

        $obj
          .removeClass('tooltipster-bottom')
          .removeClass('tooltipster-left')
          .removeClass('tooltipster-right')
          .removeClass('tooltipster-top')
          .addClass('tooltipster-' + side);
      },

      /**
       * Returns the target that the tooltip should aim at for a given side.
       * The calculated value is a distance from the edge of the window
       * (left edge for top/bottom sides, top edge for left/right side). The
       * tooltip will be centered on that position and the arrow will be
       * positioned there (as much as possible).
       *
       * @param {object} helper
       * @return {integer}
       * @private
       */
      __targetFind: function(helper) {

        var target = {},
          rects = this.__instance._$origin[0].getClientRects();

        // these lines fix a Chrome bug (issue #491)
        if (rects.length > 1) {
          var opacity = this.__instance._$origin.css('opacity');
          if (opacity == 1) {
            this.__instance._$origin.css('opacity', 0.99);
            rects = this.__instance._$origin[0].getClientRects();
            this.__instance._$origin.css('opacity', 1);
          }
        }

        // by default, the target will be the middle of the origin
        if (rects.length < 2) {

          target.top = Math.floor(helper.geo.origin.windowOffset.left + (helper.geo.origin.size.width / 2));
          target.bottom = target.top;

          target.left = Math.floor(helper.geo.origin.windowOffset.top + (helper.geo.origin.size.height / 2));
          target.right = target.left;
        }
        // if multiple client rects exist, the element may be text split
        // up into multiple lines and the middle of the origin may not be
        // best option anymore. We need to choose the best target client rect
        else {

          // top: the first
          var targetRect = rects[0];
          target.top = Math.floor(targetRect.left + (targetRect.right - targetRect.left) / 2);

          // right: the middle line, rounded down in case there is an even
          // number of lines (looks more centered => check out the
          // demo with 4 split lines)
          if (rects.length > 2) {
            targetRect = rects[Math.ceil(rects.length / 2) - 1];
          } else {
            targetRect = rects[0];
          }
          target.right = Math.floor(targetRect.top + (targetRect.bottom - targetRect.top) / 2);

          // bottom: the last
          targetRect = rects[rects.length - 1];
          target.bottom = Math.floor(targetRect.left + (targetRect.right - targetRect.left) / 2);

          // left: the middle line, rounded up
          if (rects.length > 2) {
            targetRect = rects[Math.ceil((rects.length + 1) / 2) - 1];
          } else {
            targetRect = rects[rects.length - 1];
          }

          target.left = Math.floor(targetRect.top + (targetRect.bottom - targetRect.top) / 2);
        }

        return target;
      }
    }
  });

  /* a build task will add "return $;" here */
  return $;

}));
// slick.js
/*
     _ _      _       _
 ___| (_) ___| | __  (_)___
/ __| | |/ __| |/ /  | / __|
\__ \ | | (__|   < _ | \__ \
|___/_|_|\___|_|\_(_)/ |___/
                   |__/

 Version: 1.6.0
  Author: Ken Wheeler
 Website: http://kenwheeler.github.io
    Docs: http://kenwheeler.github.io/slick
    Repo: http://github.com/kenwheeler/slick
  Issues: http://github.com/kenwheeler/slick/issues

 */
/* global window, document, define, jQuery, setInterval, clearInterval */
(function(factory) {
  'use strict';
  if (typeof define === 'function' && define.amd) {
    define(['jquery'], factory);
  } else if (typeof exports !== 'undefined') {
    module.exports = factory(require('jquery'));
  } else {
    factory(jQuery);
  }

}(function($) {
  'use strict';
  var Slick = window.Slick || {};

  Slick = (function() {

    var instanceUid = 0;

    function Slick(element, settings) {

      var _ = this,
        dataSettings;

      _.defaults = {
        accessibility: true,
        adaptiveHeight: false,
        appendArrows: $(element),
        appendDots: $(element),
        arrows: true,
        asNavFor: null,
        prevArrow: '<button type="button" data-role="none" class="slick-prev" aria-label="Previous" tabindex="0" role="button">Previous</button>',
        nextArrow: '<button type="button" data-role="none" class="slick-next" aria-label="Next" tabindex="0" role="button">Next</button>',
        autoplay: false,
        autoplaySpeed: 3000,
        centerMode: false,
        centerPadding: '50px',
        cssEase: 'ease',
        customPaging: function(slider, i) {
          return $('<button type="button" data-role="none" role="button" tabindex="0" />').text(i + 1);
        },
        dots: false,
        dotsClass: 'slick-dots',
        draggable: true,
        easing: 'linear',
        edgeFriction: 0.35,
        fade: false,
        focusOnSelect: false,
        infinite: true,
        initialSlide: 0,
        lazyLoad: 'ondemand',
        mobileFirst: false,
        pauseOnHover: true,
        pauseOnFocus: true,
        pauseOnDotsHover: false,
        respondTo: 'window',
        responsive: null,
        rows: 1,
        rtl: false,
        slide: '',
        slidesPerRow: 1,
        slidesToShow: 1,
        slidesToScroll: 1,
        speed: 500,
        swipe: true,
        swipeToSlide: false,
        touchMove: true,
        touchThreshold: 5,
        useCSS: true,
        useTransform: true,
        variableWidth: false,
        vertical: false,
        verticalSwiping: false,
        waitForAnimate: true,
        zIndex: 1000
      };

      _.initials = {
        animating: false,
        dragging: false,
        autoPlayTimer: null,
        currentDirection: 0,
        currentLeft: null,
        currentSlide: 0,
        direction: 1,
        $dots: null,
        listWidth: null,
        listHeight: null,
        loadIndex: 0,
        $nextArrow: null,
        $prevArrow: null,
        slideCount: null,
        slideWidth: null,
        $slideTrack: null,
        $slides: null,
        sliding: false,
        slideOffset: 0,
        swipeLeft: null,
        $list: null,
        touchObject: {},
        transformsEnabled: false,
        unslicked: false
      };

      $.extend(_, _.initials);

      _.activeBreakpoint = null;
      _.animType = null;
      _.animProp = null;
      _.breakpoints = [];
      _.breakpointSettings = [];
      _.cssTransitions = false;
      _.focussed = false;
      _.interrupted = false;
      _.hidden = 'hidden';
      _.paused = true;
      _.positionProp = null;
      _.respondTo = null;
      _.rowCount = 1;
      _.shouldClick = true;
      _.$slider = $(element);
      _.$slidesCache = null;
      _.transformType = null;
      _.transitionType = null;
      _.visibilityChange = 'visibilitychange';
      _.windowWidth = 0;
      _.windowTimer = null;

      dataSettings = $(element).data('slick') || {};

      _.options = $.extend({}, _.defaults, settings, dataSettings);

      _.currentSlide = _.options.initialSlide;

      _.originalSettings = _.options;

      if (typeof document.mozHidden !== 'undefined') {
        _.hidden = 'mozHidden';
        _.visibilityChange = 'mozvisibilitychange';
      } else if (typeof document.webkitHidden !== 'undefined') {
        _.hidden = 'webkitHidden';
        _.visibilityChange = 'webkitvisibilitychange';
      }

      _.autoPlay = $.proxy(_.autoPlay, _);
      _.autoPlayClear = $.proxy(_.autoPlayClear, _);
      _.autoPlayIterator = $.proxy(_.autoPlayIterator, _);
      _.changeSlide = $.proxy(_.changeSlide, _);
      _.clickHandler = $.proxy(_.clickHandler, _);
      _.selectHandler = $.proxy(_.selectHandler, _);
      _.setPosition = $.proxy(_.setPosition, _);
      _.swipeHandler = $.proxy(_.swipeHandler, _);
      _.dragHandler = $.proxy(_.dragHandler, _);
      _.keyHandler = $.proxy(_.keyHandler, _);

      _.instanceUid = instanceUid++;

      // A simple way to check for HTML strings
      // Strict HTML recognition (must start with <)
      // Extracted from jQuery v1.11 source
      _.htmlExpr = /^(?:\s*(<[\w\W]+>)[^>]*)$/;


      _.registerBreakpoints();
      _.init(true);

    }

    return Slick;

  }());

  Slick.prototype.activateADA = function() {
    var _ = this;

    _.$slideTrack.find('.slick-active').attr({
      'aria-hidden': 'false'
    }).find('a, input, button, select').attr({
      'tabindex': '0'
    });

  };

  Slick.prototype.addSlide = Slick.prototype.slickAdd = function(markup, index, addBefore) {

    var _ = this;

    if (typeof(index) === 'boolean') {
      addBefore = index;
      index = null;
    } else if (index < 0 || (index >= _.slideCount)) {
      return false;
    }

    _.unload();

    if (typeof(index) === 'number') {
      if (index === 0 && _.$slides.length === 0) {
        $(markup).appendTo(_.$slideTrack);
      } else if (addBefore) {
        $(markup).insertBefore(_.$slides.eq(index));
      } else {
        $(markup).insertAfter(_.$slides.eq(index));
      }
    } else {
      if (addBefore === true) {
        $(markup).prependTo(_.$slideTrack);
      } else {
        $(markup).appendTo(_.$slideTrack);
      }
    }

    _.$slides = _.$slideTrack.children(this.options.slide);

    _.$slideTrack.children(this.options.slide).detach();

    _.$slideTrack.append(_.$slides);

    _.$slides.each(function(index, element) {
      $(element).attr('data-slick-index', index);
    });

    _.$slidesCache = _.$slides;

    _.reinit();

  };

  Slick.prototype.animateHeight = function() {
    var _ = this;
    if (_.options.slidesToShow === 1 && _.options.adaptiveHeight === true && _.options.vertical === false) {
      var targetHeight = _.$slides.eq(_.currentSlide).outerHeight(true);
      _.$list.animate({
        height: targetHeight
      }, _.options.speed);
    }
  };

  Slick.prototype.animateSlide = function(targetLeft, callback) {

    var animProps = {},
      _ = this;

    _.animateHeight();

    if (_.options.rtl === true && _.options.vertical === false) {
      targetLeft = -targetLeft;
    }
    if (_.transformsEnabled === false) {
      if (_.options.vertical === false) {
        _.$slideTrack.animate({
          left: targetLeft
        }, _.options.speed, _.options.easing, callback);
      } else {
        _.$slideTrack.animate({
          top: targetLeft
        }, _.options.speed, _.options.easing, callback);
      }

    } else {

      if (_.cssTransitions === false) {
        if (_.options.rtl === true) {
          _.currentLeft = -(_.currentLeft);
        }
        $({
          animStart: _.currentLeft
        }).animate({
          animStart: targetLeft
        }, {
          duration: _.options.speed,
          easing: _.options.easing,
          step: function(now) {
            now = Math.ceil(now);
            if (_.options.vertical === false) {
              animProps[_.animType] = 'translate(' +
                now + 'px, 0px)';
              _.$slideTrack.css(animProps);
            } else {
              animProps[_.animType] = 'translate(0px,' +
                now + 'px)';
              _.$slideTrack.css(animProps);
            }
          },
          complete: function() {
            if (callback) {
              callback.call();
            }
          }
        });

      } else {

        _.applyTransition();
        targetLeft = Math.ceil(targetLeft);

        if (_.options.vertical === false) {
          animProps[_.animType] = 'translate3d(' + targetLeft + 'px, 0px, 0px)';
        } else {
          animProps[_.animType] = 'translate3d(0px,' + targetLeft + 'px, 0px)';
        }
        _.$slideTrack.css(animProps);

        if (callback) {
          setTimeout(function() {

            _.disableTransition();

            callback.call();
          }, _.options.speed);
        }

      }

    }

  };

  Slick.prototype.getNavTarget = function() {

    var _ = this,
      asNavFor = _.options.asNavFor;

    if (asNavFor && asNavFor !== null) {
      asNavFor = $(asNavFor).not(_.$slider);
    }

    return asNavFor;

  };

  Slick.prototype.asNavFor = function(index) {

    var _ = this,
      asNavFor = _.getNavTarget();

    if (asNavFor !== null && typeof asNavFor === 'object') {
      asNavFor.each(function() {
        var target = $(this).slick('getSlick');
        if (!target.unslicked) {
          target.slideHandler(index, true);
        }
      });
    }

  };

  Slick.prototype.applyTransition = function(slide) {

    var _ = this,
      transition = {};

    if (_.options.fade === false) {
      transition[_.transitionType] = _.transformType + ' ' + _.options.speed + 'ms ' + _.options.cssEase;
    } else {
      transition[_.transitionType] = 'opacity ' + _.options.speed + 'ms ' + _.options.cssEase;
    }

    if (_.options.fade === false) {
      _.$slideTrack.css(transition);
    } else {
      _.$slides.eq(slide).css(transition);
    }

  };

  Slick.prototype.autoPlay = function() {

    var _ = this;

    _.autoPlayClear();

    if (_.slideCount > _.options.slidesToShow) {
      _.autoPlayTimer = setInterval(_.autoPlayIterator, _.options.autoplaySpeed);
    }

  };

  Slick.prototype.autoPlayClear = function() {

    var _ = this;

    if (_.autoPlayTimer) {
      clearInterval(_.autoPlayTimer);
    }

  };

  Slick.prototype.autoPlayIterator = function() {

    var _ = this,
      slideTo = _.currentSlide + _.options.slidesToScroll;

    if (!_.paused && !_.interrupted && !_.focussed) {

      if (_.options.infinite === false) {

        if (_.direction === 1 && (_.currentSlide + 1) === (_.slideCount - 1)) {
          _.direction = 0;
        } else if (_.direction === 0) {

          slideTo = _.currentSlide - _.options.slidesToScroll;

          if (_.currentSlide - 1 === 0) {
            _.direction = 1;
          }

        }

      }

      _.slideHandler(slideTo);

    }

  };

  Slick.prototype.buildArrows = function() {

    var _ = this;

    if (_.options.arrows === true) {

      _.$prevArrow = $(_.options.prevArrow).addClass('slick-arrow');
      _.$nextArrow = $(_.options.nextArrow).addClass('slick-arrow');

      if (_.slideCount > _.options.slidesToShow) {

        _.$prevArrow.removeClass('slick-hidden').removeAttr('aria-hidden tabindex');
        _.$nextArrow.removeClass('slick-hidden').removeAttr('aria-hidden tabindex');

        if (_.htmlExpr.test(_.options.prevArrow)) {
          _.$prevArrow.prependTo(_.options.appendArrows);
        }

        if (_.htmlExpr.test(_.options.nextArrow)) {
          _.$nextArrow.appendTo(_.options.appendArrows);
        }

        if (_.options.infinite !== true) {
          _.$prevArrow
            .addClass('slick-disabled')
            .attr('aria-disabled', 'true');
        }

      } else {

        _.$prevArrow.add(_.$nextArrow)

        .addClass('slick-hidden')
          .attr({
            'aria-disabled': 'true',
            'tabindex': '-1'
          });

      }

    }

  };

  Slick.prototype.buildDots = function() {

    var _ = this,
      i, dot;

    if (_.options.dots === true && _.slideCount > _.options.slidesToShow) {

      _.$slider.addClass('slick-dotted');

      dot = $('<ul />').addClass(_.options.dotsClass);

      for (i = 0; i <= _.getDotCount(); i += 1) {
        dot.append($('<li />').append(_.options.customPaging.call(this, _, i)));
      }

      _.$dots = dot.appendTo(_.options.appendDots);

      _.$dots.find('li').first().addClass('slick-active').attr('aria-hidden', 'false');

    }

  };

  Slick.prototype.buildOut = function() {

    var _ = this;

    _.$slides =
      _.$slider
      .children(_.options.slide + ':not(.slick-cloned)')
      .addClass('slick-slide');

    _.slideCount = _.$slides.length;

    _.$slides.each(function(index, element) {
      $(element)
        .attr('data-slick-index', index)
        .data('originalStyling', $(element).attr('style') || '');
    });

    _.$slider.addClass('slick-slider');

    _.$slideTrack = (_.slideCount === 0) ?
      $('<div class="slick-track"/>').appendTo(_.$slider) :
      _.$slides.wrapAll('<div class="slick-track"/>').parent();

    _.$list = _.$slideTrack.wrap(
      '<div aria-live="polite" class="slick-list"/>').parent();
    _.$slideTrack.css('opacity', 0);

    if (_.options.centerMode === true || _.options.swipeToSlide === true) {
      _.options.slidesToScroll = 1;
    }

    $('img[data-lazy]', _.$slider).not('[src]').addClass('slick-loading');

    _.setupInfinite();

    _.buildArrows();

    _.buildDots();

    _.updateDots();


    _.setSlideClasses(typeof _.currentSlide === 'number' ? _.currentSlide : 0);

    if (_.options.draggable === true) {
      _.$list.addClass('draggable');
    }

  };

  Slick.prototype.buildRows = function() {

    var _ = this,
      a, b, c, newSlides, numOfSlides, originalSlides, slidesPerSection;

    newSlides = document.createDocumentFragment();
    originalSlides = _.$slider.children();

    if (_.options.rows > 1) {

      slidesPerSection = _.options.slidesPerRow * _.options.rows;
      numOfSlides = Math.ceil(
        originalSlides.length / slidesPerSection
      );

      for (a = 0; a < numOfSlides; a++) {
        var slide = document.createElement('div');
        for (b = 0; b < _.options.rows; b++) {
          var row = document.createElement('div');
          for (c = 0; c < _.options.slidesPerRow; c++) {
            var target = (a * slidesPerSection + ((b * _.options.slidesPerRow) + c));
            if (originalSlides.get(target)) {
              row.appendChild(originalSlides.get(target));
            }
          }
          slide.appendChild(row);
        }
        newSlides.appendChild(slide);
      }

      _.$slider.empty().append(newSlides);
      _.$slider.children().children().children()
        .css({
          'width': (100 / _.options.slidesPerRow) + '%',
          'display': 'inline-block'
        });

    }

  };

  Slick.prototype.checkResponsive = function(initial, forceUpdate) {

    var _ = this,
      breakpoint, targetBreakpoint, respondToWidth, triggerBreakpoint = false;
    var sliderWidth = _.$slider.width();
    var windowWidth = window.innerWidth || $(window).width();

    if (_.respondTo === 'window') {
      respondToWidth = windowWidth;
    } else if (_.respondTo === 'slider') {
      respondToWidth = sliderWidth;
    } else if (_.respondTo === 'min') {
      respondToWidth = Math.min(windowWidth, sliderWidth);
    }

    if (_.options.responsive &&
      _.options.responsive.length &&
      _.options.responsive !== null) {

      targetBreakpoint = null;

      for (breakpoint in _.breakpoints) {
        if (_.breakpoints.hasOwnProperty(breakpoint)) {
          if (_.originalSettings.mobileFirst === false) {
            if (respondToWidth < _.breakpoints[breakpoint]) {
              targetBreakpoint = _.breakpoints[breakpoint];
            }
          } else {
            if (respondToWidth > _.breakpoints[breakpoint]) {
              targetBreakpoint = _.breakpoints[breakpoint];
            }
          }
        }
      }

      if (targetBreakpoint !== null) {
        if (_.activeBreakpoint !== null) {
          if (targetBreakpoint !== _.activeBreakpoint || forceUpdate) {
            _.activeBreakpoint =
              targetBreakpoint;
            if (_.breakpointSettings[targetBreakpoint] === 'unslick') {
              _.unslick(targetBreakpoint);
            } else {
              _.options = $.extend({}, _.originalSettings,
                _.breakpointSettings[
                  targetBreakpoint]);
              if (initial === true) {
                _.currentSlide = _.options.initialSlide;
              }
              _.refresh(initial);
            }
            triggerBreakpoint = targetBreakpoint;
          }
        } else {
          _.activeBreakpoint = targetBreakpoint;
          if (_.breakpointSettings[targetBreakpoint] === 'unslick') {
            _.unslick(targetBreakpoint);
          } else {
            _.options = $.extend({}, _.originalSettings,
              _.breakpointSettings[
                targetBreakpoint]);
            if (initial === true) {
              _.currentSlide = _.options.initialSlide;
            }
            _.refresh(initial);
          }
          triggerBreakpoint = targetBreakpoint;
        }
      } else {
        if (_.activeBreakpoint !== null) {
          _.activeBreakpoint = null;
          _.options = _.originalSettings;
          if (initial === true) {
            _.currentSlide = _.options.initialSlide;
          }
          _.refresh(initial);
          triggerBreakpoint = targetBreakpoint;
        }
      }

      // only trigger breakpoints during an actual break. not on initialize.
      if (!initial && triggerBreakpoint !== false) {
        _.$slider.trigger('breakpoint', [_, triggerBreakpoint]);
      }
    }

  };

  Slick.prototype.changeSlide = function(event, dontAnimate) {

    var _ = this,
      $target = $(event.currentTarget),
      indexOffset, slideOffset, unevenOffset;

    // If target is a link, prevent default action.
    if ($target.is('a')) {
      event.preventDefault();
    }

    // If target is not the <li> element (ie: a child), find the <li>.
    if (!$target.is('li')) {
      $target = $target.closest('li');
    }

    unevenOffset = (_.slideCount % _.options.slidesToScroll !== 0);
    indexOffset = unevenOffset ? 0 : (_.slideCount - _.currentSlide) % _.options.slidesToScroll;

    switch (event.data.message) {

      case 'previous':
        slideOffset = indexOffset === 0 ? _.options.slidesToScroll : _.options.slidesToShow - indexOffset;
        if (_.slideCount > _.options.slidesToShow) {
          _.slideHandler(_.currentSlide - slideOffset, false, dontAnimate);
        }
        break;

      case 'next':
        slideOffset = indexOffset === 0 ? _.options.slidesToScroll : indexOffset;
        if (_.slideCount > _.options.slidesToShow) {
          _.slideHandler(_.currentSlide + slideOffset, false, dontAnimate);
        }
        break;

      case 'index':
        var index = event.data.index === 0 ? 0 :
          event.data.index || $target.index() * _.options.slidesToScroll;

        _.slideHandler(_.checkNavigable(index), false, dontAnimate);
        $target.children().trigger('focus');
        break;

      default:
        return;
    }

  };

  Slick.prototype.checkNavigable = function(index) {

    var _ = this,
      navigables, prevNavigable;

    navigables = _.getNavigableIndexes();
    prevNavigable = 0;
    if (index > navigables[navigables.length - 1]) {
      index = navigables[navigables.length - 1];
    } else {
      for (var n in navigables) {
        if (index < navigables[n]) {
          index = prevNavigable;
          break;
        }
        prevNavigable = navigables[n];
      }
    }

    return index;
  };

  Slick.prototype.cleanUpEvents = function() {

    var _ = this;

    if (_.options.dots && _.$dots !== null) {

      $('li', _.$dots)
        .off('click.slick', _.changeSlide)
        .off('mouseenter.slick', $.proxy(_.interrupt, _, true))
        .off('mouseleave.slick', $.proxy(_.interrupt, _, false));

    }

    _.$slider.off('focus.slick blur.slick');

    if (_.options.arrows === true && _.slideCount > _.options.slidesToShow) {
      _.$prevArrow && _.$prevArrow.off('click.slick', _.changeSlide);
      _.$nextArrow && _.$nextArrow.off('click.slick', _.changeSlide);
    }

    _.$list.off('touchstart.slick mousedown.slick', _.swipeHandler);
    _.$list.off('touchmove.slick mousemove.slick', _.swipeHandler);
    _.$list.off('touchend.slick mouseup.slick', _.swipeHandler);
    _.$list.off('touchcancel.slick mouseleave.slick', _.swipeHandler);

    _.$list.off('click.slick', _.clickHandler);

    $(document).off(_.visibilityChange, _.visibility);

    _.cleanUpSlideEvents();

    if (_.options.accessibility === true) {
      _.$list.off('keydown.slick', _.keyHandler);
    }

    if (_.options.focusOnSelect === true) {
      $(_.$slideTrack).children().off('click.slick', _.selectHandler);
    }

    $(window).off('orientationchange.slick.slick-' + _.instanceUid, _.orientationChange);

    $(window).off('resize.slick.slick-' + _.instanceUid, _.resize);

    $('[draggable!=true]', _.$slideTrack).off('dragstart', _.preventDefault);

    $(window).off('load.slick.slick-' + _.instanceUid, _.setPosition);
    $(document).off('ready.slick.slick-' + _.instanceUid, _.setPosition);

  };

  Slick.prototype.cleanUpSlideEvents = function() {

    var _ = this;

    _.$list.off('mouseenter.slick', $.proxy(_.interrupt, _, true));
    _.$list.off('mouseleave.slick', $.proxy(_.interrupt, _, false));

  };

  Slick.prototype.cleanUpRows = function() {

    var _ = this,
      originalSlides;

    if (_.options.rows > 1) {
      originalSlides = _.$slides.children().children();
      originalSlides.removeAttr('style');
      _.$slider.empty().append(originalSlides);
    }

  };

  Slick.prototype.clickHandler = function(event) {

    var _ = this;

    if (_.shouldClick === false) {
      event.stopImmediatePropagation();
      event.stopPropagation();
      event.preventDefault();
    }

  };

  Slick.prototype.destroy = function(refresh) {

    var _ = this;

    _.autoPlayClear();

    _.touchObject = {};

    _.cleanUpEvents();

    $('.slick-cloned', _.$slider).detach();

    if (_.$dots) {
      _.$dots.remove();
    }


    if (_.$prevArrow && _.$prevArrow.length) {

      _.$prevArrow
        .removeClass('slick-disabled slick-arrow slick-hidden')
        .removeAttr('aria-hidden aria-disabled tabindex')
        .css('display', '');

      if (_.htmlExpr.test(_.options.prevArrow)) {
        _.$prevArrow.remove();
      }
    }

    if (_.$nextArrow && _.$nextArrow.length) {

      _.$nextArrow
        .removeClass('slick-disabled slick-arrow slick-hidden')
        .removeAttr('aria-hidden aria-disabled tabindex')
        .css('display', '');

      if (_.htmlExpr.test(_.options.nextArrow)) {
        _.$nextArrow.remove();
      }

    }


    if (_.$slides) {

      _.$slides
        .removeClass('slick-slide slick-active slick-center slick-visible slick-current')
        .removeAttr('aria-hidden')
        .removeAttr('data-slick-index')
        .each(function() {
          $(this).attr('style', $(this).data('originalStyling'));
        });

      _.$slideTrack.children(this.options.slide).detach();

      _.$slideTrack.detach();

      _.$list.detach();

      _.$slider.append(_.$slides);
    }

    _.cleanUpRows();

    _.$slider.removeClass('slick-slider');
    _.$slider.removeClass('slick-initialized');
    _.$slider.removeClass('slick-dotted');

    _.unslicked = true;

    if (!refresh) {
      _.$slider.trigger('destroy', [_]);
    }

  };

  Slick.prototype.disableTransition = function(slide) {

    var _ = this,
      transition = {};

    transition[_.transitionType] = '';

    if (_.options.fade === false) {
      _.$slideTrack.css(transition);
    } else {
      _.$slides.eq(slide).css(transition);
    }

  };

  Slick.prototype.fadeSlide = function(slideIndex, callback) {

    var _ = this;

    if (_.cssTransitions === false) {

      _.$slides.eq(slideIndex).css({
        zIndex: _.options.zIndex
      });

      _.$slides.eq(slideIndex).animate({
        opacity: 1
      }, _.options.speed, _.options.easing, callback);

    } else {

      _.applyTransition(slideIndex);

      _.$slides.eq(slideIndex).css({
        opacity: 1,
        zIndex: _.options.zIndex
      });

      if (callback) {
        setTimeout(function() {

          _.disableTransition(slideIndex);

          callback.call();
        }, _.options.speed);
      }

    }

  };

  Slick.prototype.fadeSlideOut = function(slideIndex) {

    var _ = this;

    if (_.cssTransitions === false) {

      _.$slides.eq(slideIndex).animate({
        opacity: 0,
        zIndex: _.options.zIndex - 2
      }, _.options.speed, _.options.easing);

    } else {

      _.applyTransition(slideIndex);

      _.$slides.eq(slideIndex).css({
        opacity: 0,
        zIndex: _.options.zIndex - 2
      });

    }

  };

  Slick.prototype.filterSlides = Slick.prototype.slickFilter = function(filter) {

    var _ = this;

    if (filter !== null) {

      _.$slidesCache = _.$slides;

      _.unload();

      _.$slideTrack.children(this.options.slide).detach();

      _.$slidesCache.filter(filter).appendTo(_.$slideTrack);

      _.reinit();

    }

  };

  Slick.prototype.focusHandler = function() {

    var _ = this;

    _.$slider
      .off('focus.slick blur.slick')
      .on('focus.slick blur.slick',
        '*:not(.slick-arrow)',
        function(event) {

          event.stopImmediatePropagation();
          var $sf = $(this);

          setTimeout(function() {

            if (_.options.pauseOnFocus) {
              _.focussed = $sf.is(':focus');
              _.autoPlay();
            }

          }, 0);

        });
  };

  Slick.prototype.getCurrent = Slick.prototype.slickCurrentSlide = function() {

    var _ = this;
    return _.currentSlide;

  };

  Slick.prototype.getDotCount = function() {

    var _ = this;

    var breakPoint = 0;
    var counter = 0;
    var pagerQty = 0;

    if (_.options.infinite === true) {
      while (breakPoint < _.slideCount) {
        ++pagerQty;
        breakPoint = counter + _.options.slidesToScroll;
        counter += _.options.slidesToScroll <= _.options.slidesToShow ? _.options.slidesToScroll : _.options.slidesToShow;
      }
    } else if (_.options.centerMode === true) {
      pagerQty = _.slideCount;
    } else if (!_.options.asNavFor) {
      pagerQty = 1 + Math.ceil((_.slideCount - _.options.slidesToShow) / _.options.slidesToScroll);
    } else {
      while (breakPoint < _.slideCount) {
        ++pagerQty;
        breakPoint = counter + _.options.slidesToScroll;
        counter += _.options.slidesToScroll <= _.options.slidesToShow ? _.options.slidesToScroll : _.options.slidesToShow;
      }
    }

    return pagerQty - 1;

  };

  Slick.prototype.getLeft = function(slideIndex) {

    var _ = this,
      targetLeft,
      verticalHeight,
      verticalOffset = 0,
      targetSlide;

    _.slideOffset = 0;
    verticalHeight = _.$slides.first().outerHeight(true);

    if (_.options.infinite === true) {
      if (_.slideCount > _.options.slidesToShow) {
        _.slideOffset = (_.slideWidth * _.options.slidesToShow) * -1;
        verticalOffset = (verticalHeight * _.options.slidesToShow) * -1;
      }
      if (_.slideCount % _.options.slidesToScroll !== 0) {
        if (slideIndex + _.options.slidesToScroll > _.slideCount && _.slideCount > _.options.slidesToShow) {
          if (slideIndex > _.slideCount) {
            _.slideOffset = ((_.options.slidesToShow - (slideIndex - _.slideCount)) * _.slideWidth) * -1;
            verticalOffset = ((_.options.slidesToShow - (slideIndex - _.slideCount)) * verticalHeight) * -1;
          } else {
            _.slideOffset = ((_.slideCount % _.options.slidesToScroll) * _.slideWidth) * -1;
            verticalOffset = ((_.slideCount % _.options.slidesToScroll) * verticalHeight) * -1;
          }
        }
      }
    } else {
      if (slideIndex + _.options.slidesToShow > _.slideCount) {
        _.slideOffset = ((slideIndex + _.options.slidesToShow) - _.slideCount) * _.slideWidth;
        verticalOffset = ((slideIndex + _.options.slidesToShow) - _.slideCount) * verticalHeight;
      }
    }

    if (_.slideCount <= _.options.slidesToShow) {
      _.slideOffset = 0;
      verticalOffset = 0;
    }

    if (_.options.centerMode === true && _.options.infinite === true) {
      _.slideOffset += _.slideWidth * Math.floor(_.options.slidesToShow / 2) - _.slideWidth;
    } else if (_.options.centerMode === true) {
      _.slideOffset = 0;
      _.slideOffset += _.slideWidth * Math.floor(_.options.slidesToShow / 2);
    }

    if (_.options.vertical === false) {
      targetLeft = ((slideIndex * _.slideWidth) * -1) + _.slideOffset;
    } else {
      targetLeft = ((slideIndex * verticalHeight) * -1) + verticalOffset;
    }

    if (_.options.variableWidth === true) {

      if (_.slideCount <= _.options.slidesToShow || _.options.infinite === false) {
        targetSlide = _.$slideTrack.children('.slick-slide').eq(slideIndex);
      } else {
        targetSlide = _.$slideTrack.children('.slick-slide').eq(slideIndex + _.options.slidesToShow);
      }

      if (_.options.rtl === true) {
        if (targetSlide[0]) {
          targetLeft = (_.$slideTrack.width() - targetSlide[0].offsetLeft - targetSlide.width()) * -1;
        } else {
          targetLeft = 0;
        }
      } else {
        targetLeft = targetSlide[0] ? targetSlide[0].offsetLeft * -1 : 0;
      }

      if (_.options.centerMode === true) {
        if (_.slideCount <= _.options.slidesToShow || _.options.infinite === false) {
          targetSlide = _.$slideTrack.children('.slick-slide').eq(slideIndex);
        } else {
          targetSlide = _.$slideTrack.children('.slick-slide').eq(slideIndex + _.options.slidesToShow + 1);
        }

        if (_.options.rtl === true) {
          if (targetSlide[0]) {
            targetLeft = (_.$slideTrack.width() - targetSlide[0].offsetLeft - targetSlide.width()) * -1;
          } else {
            targetLeft = 0;
          }
        } else {
          targetLeft = targetSlide[0] ? targetSlide[0].offsetLeft * -1 : 0;
        }

        targetLeft += (_.$list.width() - targetSlide.outerWidth()) / 2;
      }
    }

    return targetLeft;

  };

  Slick.prototype.getOption = Slick.prototype.slickGetOption = function(option) {

    var _ = this;

    return _.options[option];

  };

  Slick.prototype.getNavigableIndexes = function() {

    var _ = this,
      breakPoint = 0,
      counter = 0,
      indexes = [],
      max;

    if (_.options.infinite === false) {
      max = _.slideCount;
    } else {
      breakPoint = _.options.slidesToScroll * -1;
      counter = _.options.slidesToScroll * -1;
      max = _.slideCount * 2;
    }

    while (breakPoint < max) {
      indexes.push(breakPoint);
      breakPoint = counter + _.options.slidesToScroll;
      counter += _.options.slidesToScroll <= _.options.slidesToShow ? _.options.slidesToScroll : _.options.slidesToShow;
    }

    return indexes;

  };

  Slick.prototype.getSlick = function() {

    return this;

  };

  Slick.prototype.getSlideCount = function() {

    var _ = this,
      slidesTraversed, swipedSlide, centerOffset;

    centerOffset = _.options.centerMode === true ? _.slideWidth * Math.floor(_.options.slidesToShow / 2) : 0;

    if (_.options.swipeToSlide === true) {
      _.$slideTrack.find('.slick-slide').each(function(index, slide) {
        if (slide.offsetLeft - centerOffset + ($(slide).outerWidth() / 2) > (_.swipeLeft * -1)) {
          swipedSlide = slide;
          return false;
        }
      });

      slidesTraversed = Math.abs($(swipedSlide).attr('data-slick-index') - _.currentSlide) || 1;

      return slidesTraversed;

    } else {
      return _.options.slidesToScroll;
    }

  };

  Slick.prototype.goTo = Slick.prototype.slickGoTo = function(slide, dontAnimate) {

    var _ = this;

    _.changeSlide({
      data: {
        message: 'index',
        index: parseInt(slide)
      }
    }, dontAnimate);

  };

  Slick.prototype.init = function(creation) {

    var _ = this;

    if (!$(_.$slider).hasClass('slick-initialized')) {

      $(_.$slider).addClass('slick-initialized');

      _.buildRows();
      _.buildOut();
      _.setProps();
      _.startLoad();
      _.loadSlider();
      _.initializeEvents();
      _.updateArrows();
      _.updateDots();
      _.checkResponsive(true);
      _.focusHandler();

    }

    if (creation) {
      _.$slider.trigger('init', [_]);
    }

    if (_.options.accessibility === true) {
      _.initADA();
    }

    if (_.options.autoplay) {

      _.paused = false;
      _.autoPlay();

    }

  };

  Slick.prototype.initADA = function() {
    var _ = this;
    _.$slides.add(_.$slideTrack.find('.slick-cloned')).attr({
      'aria-hidden': 'true',
      'tabindex': '-1'
    }).find('a, input, button, select').attr({
      'tabindex': '-1'
    });

    _.$slideTrack.attr('role', 'listbox');

    _.$slides.not(_.$slideTrack.find('.slick-cloned')).each(function(i) {
      $(this).attr({
        'role': 'option',
        'aria-describedby': 'slick-slide' + _.instanceUid + i + ''
      });
    });

    if (_.$dots !== null) {
      _.$dots.attr('role', 'tablist').find('li').each(function(i) {
          $(this).attr({
            'role': 'presentation',
            'aria-selected': 'false',
            'aria-controls': 'navigation' + _.instanceUid + i + '',
            'id': 'slick-slide' + _.instanceUid + i + ''
          });
        })
        .first().attr('aria-selected', 'true').end()
        .find('button').attr('role', 'button').end()
        .closest('div').attr('role', 'toolbar');
    }
    _.activateADA();

  };

  Slick.prototype.initArrowEvents = function() {

    var _ = this;

    if (_.options.arrows === true && _.slideCount > _.options.slidesToShow) {
      _.$prevArrow
        .off('click.slick')
        .on('click.slick', {
          message: 'previous'
        }, _.changeSlide);
      _.$nextArrow
        .off('click.slick')
        .on('click.slick', {
          message: 'next'
        }, _.changeSlide);
    }

  };

  Slick.prototype.initDotEvents = function() {

    var _ = this;

    if (_.options.dots === true && _.slideCount > _.options.slidesToShow) {
      $('li', _.$dots).on('click.slick', {
        message: 'index'
      }, _.changeSlide);
    }

    if (_.options.dots === true && _.options.pauseOnDotsHover === true) {

      $('li', _.$dots)
        .on('mouseenter.slick', $.proxy(_.interrupt, _, true))
        .on('mouseleave.slick', $.proxy(_.interrupt, _, false));

    }

  };

  Slick.prototype.initSlideEvents = function() {

    var _ = this;

    if (_.options.pauseOnHover) {

      _.$list.on('mouseenter.slick', $.proxy(_.interrupt, _, true));
      _.$list.on('mouseleave.slick', $.proxy(_.interrupt, _, false));

    }

  };

  Slick.prototype.initializeEvents = function() {

    var _ = this;

    _.initArrowEvents();

    _.initDotEvents();
    _.initSlideEvents();

    _.$list.on('touchstart.slick mousedown.slick', {
      action: 'start'
    }, _.swipeHandler);
    _.$list.on('touchmove.slick mousemove.slick', {
      action: 'move'
    }, _.swipeHandler);
    _.$list.on('touchend.slick mouseup.slick', {
      action: 'end'
    }, _.swipeHandler);
    _.$list.on('touchcancel.slick mouseleave.slick', {
      action: 'end'
    }, _.swipeHandler);

    _.$list.on('click.slick', _.clickHandler);

    $(document).on(_.visibilityChange, $.proxy(_.visibility, _));

    if (_.options.accessibility === true) {
      _.$list.on('keydown.slick', _.keyHandler);
    }

    if (_.options.focusOnSelect === true) {
      $(_.$slideTrack).children().on('click.slick', _.selectHandler);
    }

    $(window).on('orientationchange.slick.slick-' + _.instanceUid, $.proxy(_.orientationChange, _));

    $(window).on('resize.slick.slick-' + _.instanceUid, $.proxy(_.resize, _));

    $('[draggable!=true]', _.$slideTrack).on('dragstart', _.preventDefault);

    $(window).on('load.slick.slick-' + _.instanceUid, _.setPosition);
    $(document).on('ready.slick.slick-' + _.instanceUid, _.setPosition);

  };

  Slick.prototype.initUI = function() {

    var _ = this;

    if (_.options.arrows === true && _.slideCount > _.options.slidesToShow) {

      _.$prevArrow.show();
      _.$nextArrow.show();

    }

    if (_.options.dots === true && _.slideCount > _.options.slidesToShow) {

      _.$dots.show();

    }

  };

  Slick.prototype.keyHandler = function(event) {

    var _ = this;
    //Dont slide if the cursor is inside the form fields and arrow keys are pressed
    if (!event.target.tagName.match('TEXTAREA|INPUT|SELECT')) {
      if (event.keyCode === 37 && _.options.accessibility === true) {
        _.changeSlide({
          data: {
            message: _.options.rtl === true ? 'next' : 'previous'
          }
        });
      } else if (event.keyCode === 39 && _.options.accessibility === true) {
        _.changeSlide({
          data: {
            message: _.options.rtl === true ? 'previous' : 'next'
          }
        });
      }
    }

  };

  Slick.prototype.lazyLoad = function() {

    var _ = this,
      loadRange, cloneRange, rangeStart, rangeEnd;

    function loadImages(imagesScope) {

      $('img[data-lazy]', imagesScope).each(function() {

        var image = $(this),
          imageSource = $(this).attr('data-lazy'),
          imageToLoad = document.createElement('img');

        imageToLoad.onload = function() {

          image
            .animate({
              opacity: 0
            }, 100, function() {
              image
                .attr('src', imageSource)
                .animate({
                  opacity: 1
                }, 200, function() {
                  image
                    .removeAttr('data-lazy')
                    .removeClass('slick-loading');
                });
              _.$slider.trigger('lazyLoaded', [_, image, imageSource]);
            });

        };

        imageToLoad.onerror = function() {

          image
            .removeAttr('data-lazy')
            .removeClass('slick-loading')
            .addClass('slick-lazyload-error');

          _.$slider.trigger('lazyLoadError', [_, image, imageSource]);

        };

        imageToLoad.src = imageSource;

      });

    }

    if (_.options.centerMode === true) {
      if (_.options.infinite === true) {
        rangeStart = _.currentSlide + (_.options.slidesToShow / 2 + 1);
        rangeEnd = rangeStart + _.options.slidesToShow + 2;
      } else {
        rangeStart = Math.max(0, _.currentSlide - (_.options.slidesToShow / 2 + 1));
        rangeEnd = 2 + (_.options.slidesToShow / 2 + 1) + _.currentSlide;
      }
    } else {
      rangeStart = _.options.infinite ? _.options.slidesToShow + _.currentSlide : _.currentSlide;
      rangeEnd = Math.ceil(rangeStart + _.options.slidesToShow);
      if (_.options.fade === true) {
        if (rangeStart > 0) rangeStart--;
        if (rangeEnd <= _.slideCount) rangeEnd++;
      }
    }

    loadRange = _.$slider.find('.slick-slide').slice(rangeStart, rangeEnd);
    loadImages(loadRange);

    if (_.slideCount <= _.options.slidesToShow) {
      cloneRange = _.$slider.find('.slick-slide');
      loadImages(cloneRange);
    } else
    if (_.currentSlide >= _.slideCount - _.options.slidesToShow) {
      cloneRange = _.$slider.find('.slick-cloned').slice(0, _.options.slidesToShow);
      loadImages(cloneRange);
    } else if (_.currentSlide === 0) {
      cloneRange = _.$slider.find('.slick-cloned').slice(_.options.slidesToShow * -1);
      loadImages(cloneRange);
    }

  };

  Slick.prototype.loadSlider = function() {

    var _ = this;

    _.setPosition();

    _.$slideTrack.css({
      opacity: 1
    });

    _.$slider.removeClass('slick-loading');

    _.initUI();

    if (_.options.lazyLoad === 'progressive') {
      _.progressiveLazyLoad();
    }

  };

  Slick.prototype.next = Slick.prototype.slickNext = function() {

    var _ = this;

    _.changeSlide({
      data: {
        message: 'next'
      }
    });

  };

  Slick.prototype.orientationChange = function() {

    var _ = this;

    _.checkResponsive();
    _.setPosition();

  };

  Slick.prototype.pause = Slick.prototype.slickPause = function() {

    var _ = this;

    _.autoPlayClear();
    _.paused = true;

  };

  Slick.prototype.play = Slick.prototype.slickPlay = function() {

    var _ = this;

    _.autoPlay();
    _.options.autoplay = true;
    _.paused = false;
    _.focussed = false;
    _.interrupted = false;

  };

  Slick.prototype.postSlide = function(index) {

    var _ = this;

    if (!_.unslicked) {

      _.$slider.trigger('afterChange', [_, index]);

      _.animating = false;

      _.setPosition();

      _.swipeLeft = null;

      if (_.options.autoplay) {
        _.autoPlay();
      }

      if (_.options.accessibility === true) {
        _.initADA();
      }

    }

  };

  Slick.prototype.prev = Slick.prototype.slickPrev = function() {

    var _ = this;

    _.changeSlide({
      data: {
        message: 'previous'
      }
    });

  };

  Slick.prototype.preventDefault = function(event) {

    event.preventDefault();

  };

  Slick.prototype.progressiveLazyLoad = function(tryCount) {

    tryCount = tryCount || 1;

    var _ = this,
      $imgsToLoad = $('img[data-lazy]', _.$slider),
      image,
      imageSource,
      imageToLoad;

    if ($imgsToLoad.length) {

      image = $imgsToLoad.first();
      imageSource = image.attr('data-lazy');
      imageToLoad = document.createElement('img');

      imageToLoad.onload = function() {

        image
          .attr('src', imageSource)
          .removeAttr('data-lazy')
          .removeClass('slick-loading');

        if (_.options.adaptiveHeight === true) {
          _.setPosition();
        }

        _.$slider.trigger('lazyLoaded', [_, image, imageSource]);
        _.progressiveLazyLoad();

      };

      imageToLoad.onerror = function() {

        if (tryCount < 3) {

          /**
           * try to load the image 3 times,
           * leave a slight delay so we don't get
           * servers blocking the request.
           */
          setTimeout(function() {
            _.progressiveLazyLoad(tryCount + 1);
          }, 500);

        } else {

          image
            .removeAttr('data-lazy')
            .removeClass('slick-loading')
            .addClass('slick-lazyload-error');

          _.$slider.trigger('lazyLoadError', [_, image, imageSource]);

          _.progressiveLazyLoad();

        }

      };

      imageToLoad.src = imageSource;

    } else {

      _.$slider.trigger('allImagesLoaded', [_]);

    }

  };

  Slick.prototype.refresh = function(initializing) {

    var _ = this,
      currentSlide, lastVisibleIndex;

    lastVisibleIndex = _.slideCount - _.options.slidesToShow;

    // in non-infinite sliders, we don't want to go past the
    // last visible index.
    if (!_.options.infinite && (_.currentSlide > lastVisibleIndex)) {
      _.currentSlide = lastVisibleIndex;
    }

    // if less slides than to show, go to start.
    if (_.slideCount <= _.options.slidesToShow) {
      _.currentSlide = 0;

    }

    currentSlide = _.currentSlide;

    _.destroy(true);

    $.extend(_, _.initials, {
      currentSlide: currentSlide
    });

    _.init();

    if (!initializing) {

      _.changeSlide({
        data: {
          message: 'index',
          index: currentSlide
        }
      }, false);

    }

  };

  Slick.prototype.registerBreakpoints = function() {

    var _ = this,
      breakpoint, currentBreakpoint, l,
      responsiveSettings = _.options.responsive || null;

    if ($.type(responsiveSettings) === 'array' && responsiveSettings.length) {

      _.respondTo = _.options.respondTo || 'window';

      for (breakpoint in responsiveSettings) {

        l = _.breakpoints.length - 1;
        currentBreakpoint = responsiveSettings[breakpoint].breakpoint;

        if (responsiveSettings.hasOwnProperty(breakpoint)) {

          // loop through the breakpoints and cut out any existing
          // ones with the same breakpoint number, we don't want dupes.
          while (l >= 0) {
            if (_.breakpoints[l] && _.breakpoints[l] === currentBreakpoint) {
              _.breakpoints.splice(l, 1);
            }
            l--;
          }

          _.breakpoints.push(currentBreakpoint);
          _.breakpointSettings[currentBreakpoint] = responsiveSettings[breakpoint].settings;

        }

      }

      _.breakpoints.sort(function(a, b) {
        return (_.options.mobileFirst) ? a - b : b - a;
      });

    }

  };

  Slick.prototype.reinit = function() {

    var _ = this;

    _.$slides =
      _.$slideTrack
      .children(_.options.slide)
      .addClass('slick-slide');

    _.slideCount = _.$slides.length;

    if (_.currentSlide >= _.slideCount && _.currentSlide !== 0) {
      _.currentSlide = _.currentSlide - _.options.slidesToScroll;
    }

    if (_.slideCount <= _.options.slidesToShow) {
      _.currentSlide = 0;
    }

    _.registerBreakpoints();

    _.setProps();
    _.setupInfinite();
    _.buildArrows();
    _.updateArrows();
    _.initArrowEvents();
    _.buildDots();
    _.updateDots();
    _.initDotEvents();
    _.cleanUpSlideEvents();
    _.initSlideEvents();

    _.checkResponsive(false, true);

    if (_.options.focusOnSelect === true) {
      $(_.$slideTrack).children().on('click.slick', _.selectHandler);
    }

    _.setSlideClasses(typeof _.currentSlide === 'number' ? _.currentSlide : 0);

    _.setPosition();
    _.focusHandler();

    _.paused = !_.options.autoplay;
    _.autoPlay();

    _.$slider.trigger('reInit', [_]);

  };

  Slick.prototype.resize = function() {

    var _ = this;

    if ($(window).width() !== _.windowWidth) {
      clearTimeout(_.windowDelay);
      _.windowDelay = window.setTimeout(function() {
        _.windowWidth = $(window).width();
        _.checkResponsive();
        if (!_.unslicked) {
          _.setPosition();
        }
      }, 50);
    }
  };

  Slick.prototype.removeSlide = Slick.prototype.slickRemove = function(index, removeBefore, removeAll) {

    var _ = this;

    if (typeof(index) === 'boolean') {
      removeBefore = index;
      index = removeBefore === true ? 0 : _.slideCount - 1;
    } else {
      index = removeBefore === true ? --index : index;
    }

    if (_.slideCount < 1 || index < 0 || index > _.slideCount - 1) {
      return false;
    }

    _.unload();

    if (removeAll === true) {
      _.$slideTrack.children().remove();
    } else {
      _.$slideTrack.children(this.options.slide).eq(index).remove();
    }

    _.$slides = _.$slideTrack.children(this.options.slide);

    _.$slideTrack.children(this.options.slide).detach();

    _.$slideTrack.append(_.$slides);

    _.$slidesCache = _.$slides;

    _.reinit();

  };

  Slick.prototype.setCSS = function(position) {

    var _ = this,
      positionProps = {},
      x, y;

    if (_.options.rtl === true) {
      position = -position;
    }
    x = _.positionProp == 'left' ? Math.ceil(position) + 'px' : '0px';
    y = _.positionProp == 'top' ? Math.ceil(position) + 'px' : '0px';

    positionProps[_.positionProp] = position;

    if (_.transformsEnabled === false) {
      _.$slideTrack.css(positionProps);
    } else {
      positionProps = {};
      if (_.cssTransitions === false) {
        positionProps[_.animType] = 'translate(' + x + ', ' + y + ')';
        _.$slideTrack.css(positionProps);
      } else {
        positionProps[_.animType] = 'translate3d(' + x + ', ' + y + ', 0px)';
        _.$slideTrack.css(positionProps);
      }
    }

  };

  Slick.prototype.setDimensions = function() {

    var _ = this;

    if (_.options.vertical === false) {
      if (_.options.centerMode === true) {
        _.$list.css({
          padding: ('0px ' + _.options.centerPadding)
        });
      }
    } else {
      _.$list.height(_.$slides.first().outerHeight(true) * _.options.slidesToShow);
      if (_.options.centerMode === true) {
        _.$list.css({
          padding: (_.options.centerPadding + ' 0px')
        });
      }
    }

    _.listWidth = _.$list.width();
    _.listHeight = _.$list.height();


    if (_.options.vertical === false && _.options.variableWidth === false) {
      _.slideWidth = Math.ceil(_.listWidth / _.options.slidesToShow);
      _.$slideTrack.width(Math.ceil((_.slideWidth * _.$slideTrack.children('.slick-slide').length)));

    } else if (_.options.variableWidth === true) {
      _.$slideTrack.width(5000 * _.slideCount);
    } else {
      _.slideWidth = Math.ceil(_.listWidth);
      _.$slideTrack.height(Math.ceil((_.$slides.first().outerHeight(true) * _.$slideTrack.children('.slick-slide').length)));
    }

    var offset = _.$slides.first().outerWidth(true) - _.$slides.first().width();
    if (_.options.variableWidth === false) _.$slideTrack.children('.slick-slide').width(_.slideWidth - offset);

  };

  Slick.prototype.setFade = function() {

    var _ = this,
      targetLeft;

    _.$slides.each(function(index, element) {
      targetLeft = (_.slideWidth * index) * -1;
      if (_.options.rtl === true) {
        $(element).css({
          position: 'relative',
          right: targetLeft,
          top: 0,
          zIndex: _.options.zIndex - 2,
          opacity: 0
        });
      } else {
        $(element).css({
          position: 'relative',
          left: targetLeft,
          top: 0,
          zIndex: _.options.zIndex - 2,
          opacity: 0
        });
      }
    });

    _.$slides.eq(_.currentSlide).css({
      zIndex: _.options.zIndex - 1,
      opacity: 1
    });

  };

  Slick.prototype.setHeight = function() {

    var _ = this;

    if (_.options.slidesToShow === 1 && _.options.adaptiveHeight === true && _.options.vertical === false) {
      var targetHeight = _.$slides.eq(_.currentSlide).outerHeight(true);
      _.$list.css('height', targetHeight);
    }

  };

  Slick.prototype.setOption =
    Slick.prototype.slickSetOption = function() {

      /**
       * accepts arguments in format of:
       *
       *  - for changing a single option's value:
       *     .slick("setOption", option, value, refresh )
       *
       *  - for changing a set of responsive options:
       *     .slick("setOption", 'responsive', [{}, ...], refresh )
       *
       *  - for updating multiple values at once (not responsive)
       *     .slick("setOption", { 'option': value, ... }, refresh )
       */

      var _ = this,
        l, item, option, value, refresh = false,
        type;

      if ($.type(arguments[0]) === 'object') {

        option = arguments[0];
        refresh = arguments[1];
        type = 'multiple';

      } else if ($.type(arguments[0]) === 'string') {

        option = arguments[0];
        value = arguments[1];
        refresh = arguments[2];

        if (arguments[0] === 'responsive' && $.type(arguments[1]) === 'array') {

          type = 'responsive';

        } else if (typeof arguments[1] !== 'undefined') {

          type = 'single';

        }

      }

      if (type === 'single') {

        _.options[option] = value;


      } else if (type === 'multiple') {

        $.each(option, function(opt, val) {

          _.options[opt] = val;

        });


      } else if (type === 'responsive') {

        for (item in value) {

          if ($.type(_.options.responsive) !== 'array') {

            _.options.responsive = [value[item]];

          } else {

            l = _.options.responsive.length - 1;

            // loop through the responsive object and splice out duplicates.
            while (l >= 0) {

              if (_.options.responsive[l].breakpoint === value[item].breakpoint) {

                _.options.responsive.splice(l, 1);

              }

              l--;

            }

            _.options.responsive.push(value[item]);

          }

        }

      }

      if (refresh) {

        _.unload();
        _.reinit();

      }

    };

  Slick.prototype.setPosition = function() {

    var _ = this;

    _.setDimensions();

    _.setHeight();

    if (_.options.fade === false) {
      _.setCSS(_.getLeft(_.currentSlide));
    } else {
      _.setFade();
    }

    _.$slider.trigger('setPosition', [_]);

  };

  Slick.prototype.setProps = function() {

    var _ = this,
      bodyStyle = document.body.style;

    _.positionProp = _.options.vertical === true ? 'top' : 'left';

    if (_.positionProp === 'top') {
      _.$slider.addClass('slick-vertical');
    } else {
      _.$slider.removeClass('slick-vertical');
    }

    if (bodyStyle.WebkitTransition !== undefined ||
      bodyStyle.MozTransition !== undefined ||
      bodyStyle.msTransition !== undefined) {
      if (_.options.useCSS === true) {
        _.cssTransitions = true;
      }
    }

    if (_.options.fade) {
      if (typeof _.options.zIndex === 'number') {
        if (_.options.zIndex < 3) {
          _.options.zIndex = 3;
        }
      } else {
        _.options.zIndex = _.defaults.zIndex;
      }
    }

    if (bodyStyle.OTransform !== undefined) {
      _.animType = 'OTransform';
      _.transformType = '-o-transform';
      _.transitionType = 'OTransition';
      if (bodyStyle.perspectiveProperty === undefined && bodyStyle.webkitPerspective === undefined) _.animType = false;
    }
    if (bodyStyle.MozTransform !== undefined) {
      _.animType = 'MozTransform';
      _.transformType = '-moz-transform';
      _.transitionType = 'MozTransition';
      if (bodyStyle.perspectiveProperty === undefined && bodyStyle.MozPerspective === undefined) _.animType = false;
    }
    if (bodyStyle.webkitTransform !== undefined) {
      _.animType = 'webkitTransform';
      _.transformType = '-webkit-transform';
      _.transitionType = 'webkitTransition';
      if (bodyStyle.perspectiveProperty === undefined && bodyStyle.webkitPerspective === undefined) _.animType = false;
    }
    if (bodyStyle.msTransform !== undefined) {
      _.animType = 'msTransform';
      _.transformType = '-ms-transform';
      _.transitionType = 'msTransition';
      if (bodyStyle.msTransform === undefined) _.animType = false;
    }
    if (bodyStyle.transform !== undefined && _.animType !== false) {
      _.animType = 'transform';
      _.transformType = 'transform';
      _.transitionType = 'transition';
    }
    _.transformsEnabled = _.options.useTransform && (_.animType !== null && _.animType !== false);
  };


  Slick.prototype.setSlideClasses = function(index) {

    var _ = this,
      centerOffset, allSlides, indexOffset, remainder;

    allSlides = _.$slider
      .find('.slick-slide')
      .removeClass('slick-active slick-center slick-current')
      .attr('aria-hidden', 'true');

    _.$slides
      .eq(index)
      .addClass('slick-current');

    if (_.options.centerMode === true) {

      centerOffset = Math.floor(_.options.slidesToShow / 2);

      if (_.options.infinite === true) {

        if (index >= centerOffset && index <= (_.slideCount - 1) - centerOffset) {

          _.$slides
            .slice(index - centerOffset, index + centerOffset + 1)
            .addClass('slick-active')
            .attr('aria-hidden', 'false');

        } else {

          indexOffset = _.options.slidesToShow + index;
          allSlides
            .slice(indexOffset - centerOffset + 1, indexOffset + centerOffset + 2)
            .addClass('slick-active')
            .attr('aria-hidden', 'false');

        }

        if (index === 0) {

          allSlides
            .eq(allSlides.length - 1 - _.options.slidesToShow)
            .addClass('slick-center');

        } else if (index === _.slideCount - 1) {

          allSlides
            .eq(_.options.slidesToShow)
            .addClass('slick-center');

        }

      }

      _.$slides
        .eq(index)
        .addClass('slick-center');

    } else {

      if (index >= 0 && index <= (_.slideCount - _.options.slidesToShow)) {

        _.$slides
          .slice(index, index + _.options.slidesToShow)
          .addClass('slick-active')
          .attr('aria-hidden', 'false');

      } else if (allSlides.length <= _.options.slidesToShow) {

        allSlides
          .addClass('slick-active')
          .attr('aria-hidden', 'false');

      } else {

        remainder = _.slideCount % _.options.slidesToShow;
        indexOffset = _.options.infinite === true ? _.options.slidesToShow + index : index;

        if (_.options.slidesToShow == _.options.slidesToScroll && (_.slideCount - index) < _.options.slidesToShow) {

          allSlides
            .slice(indexOffset - (_.options.slidesToShow - remainder), indexOffset + remainder)
            .addClass('slick-active')
            .attr('aria-hidden', 'false');

        } else {

          allSlides
            .slice(indexOffset, indexOffset + _.options.slidesToShow)
            .addClass('slick-active')
            .attr('aria-hidden', 'false');

        }

      }

    }

    if (_.options.lazyLoad === 'ondemand') {
      _.lazyLoad();
    }

  };

  Slick.prototype.setupInfinite = function() {

    var _ = this,
      i, slideIndex, infiniteCount;

    if (_.options.fade === true) {
      _.options.centerMode = false;
    }

    if (_.options.infinite === true && _.options.fade === false) {

      slideIndex = null;

      if (_.slideCount > _.options.slidesToShow) {

        if (_.options.centerMode === true) {
          infiniteCount = _.options.slidesToShow + 1;
        } else {
          infiniteCount = _.options.slidesToShow;
        }

        for (i = _.slideCount; i > (_.slideCount -
            infiniteCount); i -= 1) {
          slideIndex = i - 1;
          $(_.$slides[slideIndex]).clone(true).attr('id', '')
            .attr('data-slick-index', slideIndex - _.slideCount)
            .prependTo(_.$slideTrack).addClass('slick-cloned');
        }
        for (i = 0; i < infiniteCount; i += 1) {
          slideIndex = i;
          $(_.$slides[slideIndex]).clone(true).attr('id', '')
            .attr('data-slick-index', slideIndex + _.slideCount)
            .appendTo(_.$slideTrack).addClass('slick-cloned');
        }
        _.$slideTrack.find('.slick-cloned').find('[id]').each(function() {
          $(this).attr('id', '');
        });

      }

    }

  };

  Slick.prototype.interrupt = function(toggle) {

    var _ = this;

    if (!toggle) {
      _.autoPlay();
    }
    _.interrupted = toggle;

  };

  Slick.prototype.selectHandler = function(event) {

    var _ = this;

    var targetElement =
      $(event.target).is('.slick-slide') ?
      $(event.target) :
      $(event.target).parents('.slick-slide');

    var index = parseInt(targetElement.attr('data-slick-index'));

    if (!index) index = 0;

    if (_.slideCount <= _.options.slidesToShow) {

      _.setSlideClasses(index);
      _.asNavFor(index);
      return;

    }

    _.slideHandler(index);

  };

  Slick.prototype.slideHandler = function(index, sync, dontAnimate) {

    var targetSlide, animSlide, oldSlide, slideLeft, targetLeft = null,
      _ = this,
      navTarget;

    sync = sync || false;

    if (_.animating === true && _.options.waitForAnimate === true) {
      return;
    }

    if (_.options.fade === true && _.currentSlide === index) {
      return;
    }

    if (_.slideCount <= _.options.slidesToShow) {
      return;
    }

    if (sync === false) {
      _.asNavFor(index);
    }

    targetSlide = index;
    targetLeft = _.getLeft(targetSlide);
    slideLeft = _.getLeft(_.currentSlide);

    _.currentLeft = _.swipeLeft === null ? slideLeft : _.swipeLeft;

    if (_.options.infinite === false && _.options.centerMode === false && (index < 0 || index > _.getDotCount() * _.options.slidesToScroll)) {
      if (_.options.fade === false) {
        targetSlide = _.currentSlide;
        if (dontAnimate !== true) {
          _.animateSlide(slideLeft, function() {
            _.postSlide(targetSlide);
          });
        } else {
          _.postSlide(targetSlide);
        }
      }
      return;
    } else if (_.options.infinite === false && _.options.centerMode === true && (index < 0 || index > (_.slideCount - _.options.slidesToScroll))) {
      if (_.options.fade === false) {
        targetSlide = _.currentSlide;
        if (dontAnimate !== true) {
          _.animateSlide(slideLeft, function() {
            _.postSlide(targetSlide);
          });
        } else {
          _.postSlide(targetSlide);
        }
      }
      return;
    }

    if (_.options.autoplay) {
      clearInterval(_.autoPlayTimer);
    }

    if (targetSlide < 0) {
      if (_.slideCount % _.options.slidesToScroll !== 0) {
        animSlide = _.slideCount - (_.slideCount % _.options.slidesToScroll);
      } else {
        animSlide = _.slideCount + targetSlide;
      }
    } else if (targetSlide >= _.slideCount) {
      if (_.slideCount % _.options.slidesToScroll !== 0) {
        animSlide = 0;
      } else {
        animSlide = targetSlide - _.slideCount;
      }
    } else {
      animSlide = targetSlide;
    }

    _.animating = true;

    _.$slider.trigger('beforeChange', [_, _.currentSlide, animSlide]);

    oldSlide = _.currentSlide;
    _.currentSlide = animSlide;

    _.setSlideClasses(_.currentSlide);

    if (_.options.asNavFor) {

      navTarget = _.getNavTarget();
      navTarget = navTarget.slick('getSlick');

      if (navTarget.slideCount <= navTarget.options.slidesToShow) {
        navTarget.setSlideClasses(_.currentSlide);
      }

    }

    _.updateDots();
    _.updateArrows();

    if (_.options.fade === true) {
      if (dontAnimate !== true) {

        _.fadeSlideOut(oldSlide);

        _.fadeSlide(animSlide, function() {
          _.postSlide(animSlide);
        });

      } else {
        _.postSlide(animSlide);
      }
      _.animateHeight();
      return;
    }

    if (dontAnimate !== true) {
      _.animateSlide(targetLeft, function() {
        _.postSlide(animSlide);
      });
    } else {
      _.postSlide(animSlide);
    }

  };

  Slick.prototype.startLoad = function() {

    var _ = this;

    if (_.options.arrows === true && _.slideCount > _.options.slidesToShow) {

      _.$prevArrow.hide();
      _.$nextArrow.hide();

    }

    if (_.options.dots === true && _.slideCount > _.options.slidesToShow) {

      _.$dots.hide();

    }

    _.$slider.addClass('slick-loading');

  };

  Slick.prototype.swipeDirection = function() {

    var xDist, yDist, r, swipeAngle, _ = this;

    xDist = _.touchObject.startX - _.touchObject.curX;
    yDist = _.touchObject.startY - _.touchObject.curY;
    r = Math.atan2(yDist, xDist);

    swipeAngle = Math.round(r * 180 / Math.PI);
    if (swipeAngle < 0) {
      swipeAngle = 360 - Math.abs(swipeAngle);
    }

    if ((swipeAngle <= 45) && (swipeAngle >= 0)) {
      return (_.options.rtl === false ? 'left' : 'right');
    }
    if ((swipeAngle <= 360) && (swipeAngle >= 315)) {
      return (_.options.rtl === false ? 'left' : 'right');
    }
    if ((swipeAngle >= 135) && (swipeAngle <= 225)) {
      return (_.options.rtl === false ? 'right' : 'left');
    }
    if (_.options.verticalSwiping === true) {
      if ((swipeAngle >= 35) && (swipeAngle <= 135)) {
        return 'down';
      } else {
        return 'up';
      }
    }

    return 'vertical';

  };

  Slick.prototype.swipeEnd = function(event) {

    var _ = this,
      slideCount,
      direction;

    _.dragging = false;
    _.interrupted = false;
    _.shouldClick = (_.touchObject.swipeLength > 10) ? false : true;

    if (_.touchObject.curX === undefined) {
      return false;
    }

    if (_.touchObject.edgeHit === true) {
      _.$slider.trigger('edge', [_, _.swipeDirection()]);
    }

    if (_.touchObject.swipeLength >= _.touchObject.minSwipe) {

      direction = _.swipeDirection();

      switch (direction) {

        case 'left':
        case 'down':

          slideCount =
            _.options.swipeToSlide ?
            _.checkNavigable(_.currentSlide + _.getSlideCount()) :
            _.currentSlide + _.getSlideCount();

          _.currentDirection = 0;

          break;

        case 'right':
        case 'up':

          slideCount =
            _.options.swipeToSlide ?
            _.checkNavigable(_.currentSlide - _.getSlideCount()) :
            _.currentSlide - _.getSlideCount();

          _.currentDirection = 1;

          break;

        default:


      }

      if (direction != 'vertical') {

        _.slideHandler(slideCount);
        _.touchObject = {};
        _.$slider.trigger('swipe', [_, direction]);

      }

    } else {

      if (_.touchObject.startX !== _.touchObject.curX) {

        _.slideHandler(_.currentSlide);
        _.touchObject = {};

      }

    }

  };

  Slick.prototype.swipeHandler = function(event) {

    var _ = this;

    if ((_.options.swipe === false) || ('ontouchend' in document && _.options.swipe === false)) {
      return;
    } else if (_.options.draggable === false && event.type.indexOf('mouse') !== -1) {
      return;
    }

    _.touchObject.fingerCount = event.originalEvent && event.originalEvent.touches !== undefined ?
      event.originalEvent.touches.length : 1;

    _.touchObject.minSwipe = _.listWidth / _.options
      .touchThreshold;

    if (_.options.verticalSwiping === true) {
      _.touchObject.minSwipe = _.listHeight / _.options
        .touchThreshold;
    }

    switch (event.data.action) {

      case 'start':
        _.swipeStart(event);
        break;

      case 'move':
        _.swipeMove(event);
        break;

      case 'end':
        _.swipeEnd(event);
        break;

    }

  };

  Slick.prototype.swipeMove = function(event) {

    var _ = this,
      edgeWasHit = false,
      curLeft, swipeDirection, swipeLength, positionOffset, touches;

    touches = event.originalEvent !== undefined ? event.originalEvent.touches : null;

    if (!_.dragging || touches && touches.length !== 1) {
      return false;
    }

    curLeft = _.getLeft(_.currentSlide);

    _.touchObject.curX = touches !== undefined ? touches[0].pageX : event.clientX;
    _.touchObject.curY = touches !== undefined ? touches[0].pageY : event.clientY;

    _.touchObject.swipeLength = Math.round(Math.sqrt(
      Math.pow(_.touchObject.curX - _.touchObject.startX, 2)));

    if (_.options.verticalSwiping === true) {
      _.touchObject.swipeLength = Math.round(Math.sqrt(
        Math.pow(_.touchObject.curY - _.touchObject.startY, 2)));
    }

    swipeDirection = _.swipeDirection();

    if (swipeDirection === 'vertical') {
      return;
    }

    if (event.originalEvent !== undefined && _.touchObject.swipeLength > 4) {
      event.preventDefault();
    }

    positionOffset = (_.options.rtl === false ? 1 : -1) * (_.touchObject.curX > _.touchObject.startX ? 1 : -1);
    if (_.options.verticalSwiping === true) {
      positionOffset = _.touchObject.curY > _.touchObject.startY ? 1 : -1;
    }


    swipeLength = _.touchObject.swipeLength;

    _.touchObject.edgeHit = false;

    if (_.options.infinite === false) {
      if ((_.currentSlide === 0 && swipeDirection === 'right') || (_.currentSlide >= _.getDotCount() && swipeDirection === 'left')) {
        swipeLength = _.touchObject.swipeLength * _.options.edgeFriction;
        _.touchObject.edgeHit = true;
      }
    }

    if (_.options.vertical === false) {
      _.swipeLeft = curLeft + swipeLength * positionOffset;
    } else {
      _.swipeLeft = curLeft + (swipeLength * (_.$list.height() / _.listWidth)) * positionOffset;
    }
    if (_.options.verticalSwiping === true) {
      _.swipeLeft = curLeft + swipeLength * positionOffset;
    }

    if (_.options.fade === true || _.options.touchMove === false) {
      return false;
    }

    if (_.animating === true) {
      _.swipeLeft = null;
      return false;
    }

    _.setCSS(_.swipeLeft);

  };

  Slick.prototype.swipeStart = function(event) {

    var _ = this,
      touches;

    _.interrupted = true;

    if (_.touchObject.fingerCount !== 1 || _.slideCount <= _.options.slidesToShow) {
      _.touchObject = {};
      return false;
    }

    if (event.originalEvent !== undefined && event.originalEvent.touches !== undefined) {
      touches = event.originalEvent.touches[0];
    }

    _.touchObject.startX = _.touchObject.curX = touches !== undefined ? touches.pageX : event.clientX;
    _.touchObject.startY = _.touchObject.curY = touches !== undefined ? touches.pageY : event.clientY;

    _.dragging = true;

  };

  Slick.prototype.unfilterSlides = Slick.prototype.slickUnfilter = function() {

    var _ = this;

    if (_.$slidesCache !== null) {

      _.unload();

      _.$slideTrack.children(this.options.slide).detach();

      _.$slidesCache.appendTo(_.$slideTrack);

      _.reinit();

    }

  };

  Slick.prototype.unload = function() {

    var _ = this;

    $('.slick-cloned', _.$slider).remove();

    if (_.$dots) {
      _.$dots.remove();
    }

    if (_.$prevArrow && _.htmlExpr.test(_.options.prevArrow)) {
      _.$prevArrow.remove();
    }

    if (_.$nextArrow && _.htmlExpr.test(_.options.nextArrow)) {
      _.$nextArrow.remove();
    }

    _.$slides
      .removeClass('slick-slide slick-active slick-visible slick-current')
      .attr('aria-hidden', 'true')
      .css('width', '');

  };

  Slick.prototype.unslick = function(fromBreakpoint) {

    var _ = this;
    _.$slider.trigger('unslick', [_, fromBreakpoint]);
    _.destroy();

  };

  Slick.prototype.updateArrows = function() {

    var _ = this,
      centerOffset;

    centerOffset = Math.floor(_.options.slidesToShow / 2);

    if (_.options.arrows === true &&
      _.slideCount > _.options.slidesToShow &&
      !_.options.infinite) {

      _.$prevArrow.removeClass('slick-disabled').attr('aria-disabled', 'false');
      _.$nextArrow.removeClass('slick-disabled').attr('aria-disabled', 'false');

      if (_.currentSlide === 0) {

        _.$prevArrow.addClass('slick-disabled').attr('aria-disabled', 'true');
        _.$nextArrow.removeClass('slick-disabled').attr('aria-disabled', 'false');

      } else if (_.currentSlide >= _.slideCount - _.options.slidesToShow && _.options.centerMode === false) {

        _.$nextArrow.addClass('slick-disabled').attr('aria-disabled', 'true');
        _.$prevArrow.removeClass('slick-disabled').attr('aria-disabled', 'false');

      } else if (_.currentSlide >= _.slideCount - 1 && _.options.centerMode === true) {

        _.$nextArrow.addClass('slick-disabled').attr('aria-disabled', 'true');
        _.$prevArrow.removeClass('slick-disabled').attr('aria-disabled', 'false');

      }

    }

  };

  Slick.prototype.updateDots = function() {

    var _ = this;

    if (_.$dots !== null) {

      _.$dots
        .find('li')
        .removeClass('slick-active')
        .attr('aria-hidden', 'true');

      _.$dots
        .find('li')
        .eq(Math.floor(_.currentSlide / _.options.slidesToScroll))
        .addClass('slick-active')
        .attr('aria-hidden', 'false');

    }

  };

  Slick.prototype.visibility = function() {

    var _ = this;

    if (_.options.autoplay) {

      if (document[_.hidden]) {

        _.interrupted = true;

      } else {

        _.interrupted = false;

      }

    }

  };

  $.fn.slick = function() {
    var _ = this,
      opt = arguments[0],
      args = Array.prototype.slice.call(arguments, 1),
      l = _.length,
      i,
      ret;
    for (i = 0; i < l; i++) {
      if (typeof opt == 'object' || typeof opt == 'undefined')
        _[i].slick = new Slick(_[i], opt);
      else
        ret = _[i].slick[opt].apply(_[i].slick, args);
      if (typeof ret != 'undefined') return ret;
    }
    return _;
  };

}));


// settings and custom code
// charts on main page
$(document).ready(function() {
  // rating for main page
  $('.topg--item-rating').each(function(index, el) {

    var id = $(this).find('.topg--item-circle').attr('id');

    var feedbackPositive = parseInt($(this).find('.topg--item-reviews-p').html());
    var feedbackNeutral = parseInt($(this).find('.topg--item-reviews-n').html());
    var feedbackNegative = parseInt($(this).find('.topg--item-reviews-m').html());

    // find max point of reviews
    var maxPoint = Math.max(feedbackPositive, feedbackNeutral, feedbackNegative);
    // find each point in % from max point
    var percentPositive = parseFloat(((feedbackPositive / maxPoint) * 100).toFixed(2));
    var percentNeutral = parseFloat(((feedbackNeutral / maxPoint) * 100).toFixed(2));
    var percentNegative = parseFloat(((feedbackNegative / maxPoint) * 100).toFixed(2));
    // set height in percent for each elements
    $(this).find('.topg--item-chart-p').css('height', percentPositive + '%');
    $(this).find('.topg--item-chart-n').css('height', percentNeutral + '%');
    $(this).find('.topg--item-chart-m').css('height', percentNegative + '%');

    // find sum of neutral and negative reviews for circle chart
    var sumPoints = feedbackPositive + feedbackNeutral + feedbackNegative;
    var posPoints = feedbackPositive + feedbackNeutral;
    var sumPointsPerc = parseFloat(((posPoints / sumPoints) * 100).toFixed(1));

    //** circles https://github.com/lugolabs/circles */
    var myCircle = Circles.create({
      id: id,
      radius: 22,
      value: sumPointsPerc,
      maxValue: 100,
      width: 3,
      text: function(value) {
        return value;
      },
      colors: ['#93a2b3', '#f5b635'],
      duration: 600,
      wrpClass: 'circles-wrp',
      textClass: 'circles-text',
      valueStrokeClass: 'circles-valueStroke',
      maxValueStrokeClass: 'circles-maxValueStroke',
      styleWrapper: true,
      styleText: true
    });
  });

  // show phone button
  $('.btn-showphone').on('click', function(e) {
    var phone = $(this).attr('data-phone');
    $(this).html(phone);
    $(this).addClass('btn-showphone-s')
  })

  $('.widget--contact-m span').on('click', function(e) {
    $(this).fadeOut('fast');
    $(this).parent('li').children('a').fadeIn('fast');
  })

  // rating on product page
  $('.widget--rating').each(function(index, el) {



    var feedbackPositive = parseInt($(this).find('.widget--rating-reviews-p').html());
    var feedbackNeutral = parseInt($(this).find('.widget--rating-reviews-n').html());
    var feedbackNegative = parseInt($(this).find('.widget--rating-reviews-m').html());

    // find max point of reviews
    var maxPoint = Math.max(feedbackPositive, feedbackNeutral, feedbackNegative);
    // find each point in % from max point
    var percentPositive = parseFloat(((feedbackPositive / maxPoint) * 100).toFixed(2));
    var percentNeutral = parseFloat(((feedbackNeutral / maxPoint) * 100).toFixed(2));
    var percentNegative = parseFloat(((feedbackNegative / maxPoint) * 100).toFixed(2));
    // set height in percent for each elements
    $(this).find('.widget--rating-chart-p').css('height', percentPositive + '%');
    $(this).find('.widget--rating-chart-n').css('height', percentNeutral + '%');
    $(this).find('.widget--rating-chart-m').css('height', percentNegative + '%');

    // find sum of neutral and negative reviews for circle chart
    var sumPoints = feedbackPositive + feedbackNeutral + feedbackNegative;
    var posPoints = feedbackPositive + feedbackNeutral;
    var sumPointsPerc = parseFloat(((posPoints / sumPoints) * 100).toFixed(1));

    //** circles https://github.com/lugolabs/circles */
    var myCircle = Circles.create({
      id: 'circles',
      radius: 22,
      value: sumPointsPerc,
      maxValue: 100,
      width: 3,
      text: function(value) {
        return value;
      },
      colors: ['#93a2b3', '#f5b635'],
      duration: 600,
      wrpClass: 'circles-wrp',
      textClass: 'circles-text',
      valueStrokeClass: 'circles-valueStroke',
      maxValueStrokeClass: 'circles-maxValueStroke',
      styleWrapper: true,
      styleText: true
    });
  });

  $('.profile--pholio-slide').slick({
    infinite: true,
    slidesToShow: 4,
    slidesToScroll: 3,
    arrows: true,
    prevArrow: '<button type="button" class="slick-prev"></button>',
    nextArrow: '<button type="button" class="slick-next"></button>',
  });

  $('.tooltip').tooltipster({
    theme: 'tooltipster-shadow'
  });



});
// autocomplete
$(function() {
  var options = {
    url: "resources/countries.json",
    getValue: "name",
    list: {
      match: {
        enabled: true
      }
    },
    theme: "square"
  };

  $("#city").easyAutocomplete(options);
});
