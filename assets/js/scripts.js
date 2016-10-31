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
// charts on main page
$(document).ready(function() {
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
