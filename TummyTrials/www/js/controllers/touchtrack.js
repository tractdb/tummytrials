// touchtrack.js     Track latest touches of links and buttons
//

'use strict';

var g_history = new Array(10);
var g_seen = 0;

// Returned touch descriptions look like this:
//
// { time: time of touch (ms since Jan 1 1970 UTC).
//   attr: attr associated with the navigation ('ng-click', 'ui-sref')
//   nodeName: node name of associated element ('A', 'BUTTON', 'DIV')
//   textContent: contained text ('Current Experiment', 'Back')
// }
//

function saw_touch(el, attr)
{
    var info = { };
    info.time = Date.now();
    info.attr = attr;
    info.nodeName = el[0].nodeName;
    var text = el[0].textContent.trim().substring(0,32);
    info.textContent = text;
    g_history[g_seen++ % g_history.length] = info;
}

(angular.module('tractdb.touchtrack', [])
.directive('ngClick', function() {
    return {
        restrict: 'A',
        link: function(scope, el, attrs) {
            el.bind('click', function(e) {
                saw_touch(el, 'ng-click');
            });
        }
    };
})

.directive('uiSref', function($timeout) {
    return {
        restrict: 'A',
        link: function(scope, el, attrs) {
            if (el[0].nodeName === 'ION-TAB') {
                // Need to handle ION-TAB specially. The associated <a>
                // elements are added as siblings, and are added after
                // this postLink call. So schedule the handling for the
                // next time around the event loop. You can definitely
                // consider this a hack.
                //
                $timeout(function() {
                    var el_index = -1;
                    var sibs = el[0].parentNode.children;
                    var seenct = 0;
                    for (var i = 0; i < sibs.length; i++)
                        if (sibs[i] === el[0]) {
                            el_index = seenct;
                            break;
                        } else if(sibs[i].nodeName === 'ION-TAB') {
                            seenct++;
                        }
                    if (el_index >= 0) {
                        seenct = 0;
                        for (var i = 0; i < sibs.length; i++)
                            if (sibs[i].nodeName === 'A') {
                                if (seenct == el_index) {
                                    var ael = angular.element(sibs[i]);
                                    ael.bind('click', function(e) {
                                        saw_touch(ael, 'ui-sref');
                                    });
                                    break;
                                } else {
                                    seenct++;
                                }
                            }
                    }
                }, 0);
            } else {
                el.bind('click', function(e) {
                    saw_touch(el, 'ui-sref');
                });
            }
        }
    };
})

.factory('TouchTrack', function() {
    return {
        latestNavTouch: function() {
            // Return latest touch of a link or button, or null if there
            // haven't been any yet.
            //
            if (g_seen < 1)
                return null;
            return g_history[(g_seen - 1) % g_history.length];
        }
    };
})

);
