// replicator.js     Manager of replication
//
// This module registers itself to be called whenever the application is
// resumed (user starts running it again). It implements a policy for
// replicating the local CouchDB against the central copy.
//
// For starters, the policy is just to replicate at every opportunity.
//

'use strict';

(angular.module('tummytrials.replicator',
    [ 'tummytrials.text', 'tummytrials.login', 'tummytrials.experiments' ])
.run(function($ionicPlatform, $rootScope, Text, Login, Experiments) {

    function do_replication()
    {
        // We just start replication, don't need to do anything with the
        // returned promise.
        //
        Text.all_p()
        .then(function(text) {
            return Login.loginfo_p('couchuser', $rootScope, text.loginfo,
                                    Experiments.valid_p)
        })
        .then(function(unpw) {
            if (unpw)
                return Experiments.replicate(unpw);
            return null;
        })
        .then(
            function good() { return null; },
            function bad() { return null; }    // Ignore any failure
        );
    }

    $ionicPlatform.ready(function() {
        // Replicate whenever app becomes active.
        //
        $rootScope.$on('appResume', do_replication);

        // Also replicate now (at startup).
        //
        do_replication();
    });
})
);
