// navlog.js     Log navigation from page to page
//
// NOTE: this module is unused and should be deleted at some point.
//
// This module subscribes to location change events, and logs them to
// the DB. Currently there's no interface to this module, it's supposed
// to "just work" all on its own.
//

'use strict';

var g_logger;

(angular.module('tractdb.navlog',
                [ 'tractdb.touchtrack', 'tummytrials.experiments' ])
.run(function($ionicPlatform, $rootScope, $timeout, TouchTrack, Experiments) {
    $ionicPlatform.ready(function() {

        function log(s)
        {
            // Initiate an update to current study (if there is one).
            // Note that we don't wait for the update to complete.
            //
            Experiments.getCurrent()
            .then(function(curex) {
                if (!curex)
                    return null;
                return Experiments.add_activity_p(curex.id, s);
            });
        }

        function clear()
        {
            // (Ignore clear requests for now.)
        }

        g_logger = new Log4js.getLogger("Navigation");
        g_logger.setLevel(Log4js.Level.ALL);
        var app = new Log4js.AbstractAppender(log, clear);
        var layo = new Log4js.BasicLayout();
        layo.LINE_SEP = '';
        app.setLayout(layo);
        g_logger.addAppender(app);

        $rootScope.$on('$locationChangeSuccess',
            function(ev, newurl) {
                // (It turns out that the location change is processed
                // just *before* the button/link touch. So postpone
                // location processing until the next event iteration to
                // get proper association between touches and location
                // changes.)
                //
                $timeout(function() {
                    var s = '$locationChangeSuccess ' + newurl;
                    var t = TouchTrack.latestNavTouch();
                    if (t) {
                        s = s + ' ' + t.attr + ' ' + t.nodeName;
                        s = s + ' "' + t.textContent.replace(/"/g, '\\"') + '"';
                    }
                    g_logger.info(s);
                }, 0);
            });
    });
})
);
