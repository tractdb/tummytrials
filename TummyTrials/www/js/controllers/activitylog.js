// activitylog.js     Log for user activities
//
// User activities are logged to the current study in a field named
// activity_log (an array of strings).
//

'use strict';

(angular.module('tummytrials.activitylog', ['tummytrials.experiments'])
    .factory('ActivityLog', function(Experiments) {

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

        var logger = new Log4js.getLogger("Activity");
        logger.setLevel(Log4js.Level.ALL);
        var app = new Log4js.AbstractAppender(log, clear);
        var layo = new Log4js.BasicLayout();
        layo.LINE_SEP = '';
        app.setLayout(layo);
        logger.addAppender(app);
        return logger;
    })
);
