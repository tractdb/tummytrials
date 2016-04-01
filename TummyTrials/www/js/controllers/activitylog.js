// activitylog.js     Log for user activities
//
// This module subscribes to events and logs them to the DB. Currently
// there's no interface to this module, it's supposed to "just work" all
// on its own. Events are logged to the current study in a field named
// activity_log (an array of strings).
//
// Events are organized into log categories:
//
//     Activity: app startup, pause, resign, active, resume
//     Navigation: user goes to new web page
//
// Navigation events are associated with specific button or link touches
// using the TouchTrack module.
//
// For what it's worth, pause events don't seem dependable for writing
// the DB. The docs say their code will be executed when the app is
// resumed, but I don't see this all the time.  The iOS-specific resign
// event seems to be more dependable (maybe because it happens a few
// microseconds earlier).
//

'use strict';

var g_actlogger; // Logger for Activity category
var g_navlogger; // Logger for Navigation category


(angular.module('tummytrials.activitylog', ['tummytrials.experiments'])
.run(function($ionicPlatform, $rootScope, $timeout, $state, TouchTrack,
                Experiments) {

    function log(s)
    {
        // Log an event to current study (if there is one). Note that
        // we don't wait for the update to complete.
        //
        Experiments.getCurrent()
        .then(function(curex) {
            if (!curex)
                return null;

            // Add millisec timestamp and current page URL to the
            // message.
            //
            var infix = Date.now() + ' ' + $state.href($state.current);
            var rb = s.indexOf(']');
            var msg;
            if (rb < 0) {
                msg = infix + ' ' + s; // Not going to happen
            } else {
                msg = s.substr(0, rb + 1) + ' ' + infix + s.substr(rb + 1);
            }

            // Add to the study.
            //
            return Experiments.add_activity_p(curex.id, msg);
        });
    }

    function clear()
    {
        // (Ignore clear requests for now.)
    }

    $ionicPlatform.ready(function() {
        g_actlogger = new Log4js.getLogger("Activity");
        g_actlogger.setLevel(Log4js.Level.ALL);
        var aapp = new Log4js.AbstractAppender(log, clear);
        var alayo = new Log4js.BasicLayout();
        alayo.LINE_SEP = '';
        aapp.setLayout(alayo);
        g_actlogger.addAppender(aapp);

        g_navlogger = new Log4js.getLogger("Navigation");
        g_navlogger.setLevel(Log4js.Level.ALL);
        var napp = new Log4js.AbstractAppender(log, clear);
        var nlayo = new Log4js.BasicLayout();
        nlayo.LINE_SEP = '';
        napp.setLayout(nlayo);
        g_navlogger.addAppender(napp);

        // There is an app startup right now.
        //
        g_actlogger.info('appStartup');

        // Log other lifecycle events when they happen.
        //
        $rootScope.$on('appPause',
            function(ev) { g_actlogger.info('appPause'); }
        );

        $rootScope.$on('appResign',
            function(ev) { g_actlogger.info('appResign'); }
        );

        $rootScope.$on('appActive',
            function(ev) { g_actlogger.info('appActive'); }
        );

        $rootScope.$on('appResume',
            function(ev) { g_actlogger.info('appResume'); }
        );

        // Log navigation events.
        //
        $rootScope.$on('$locationChangeSuccess',
            function(ev, newurl) {
                // (It turns out that the location change is processed
                // just *before* the button/link touch. So postpone
                // location processing until the next event iteration to
                // get proper association between touches and location
                // changes.)
                //
                $timeout(function() {
                    // Note: not using newurl for now.
                    //
                    var s = '$locationChangeSuccess';
                    var t = TouchTrack.latestNavTouch();
                    if (t) {
                        s = s + ' ' + t.time + ' ' + t.attr + ' ' + t.nodeName;
                        s = s + ' "' + t.textContent.replace(/"/g, '\\"') + '"';
                    }
                    g_navlogger.info(s);
                }, 0);
            }
        );
    });
})
);
