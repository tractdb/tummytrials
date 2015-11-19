// replicator.js     Manager of replication
//
// This module registers itself to be called whenever the application is
// resumed (user starts running it again). It implements a policy for
// replicating the local CouchDB against the central copy.
//
// For starters, the policy is just to replicate at every opportunity.
//
// It also offers a service named Replicator to do replication at
// specific times.
//

'use strict';

var username_tag = 'couchuser'; // Tag for HTML 5 username/password storage

function replicate_p(scope, text_s, login_s, experiments_s)
{
    // Return a promise to do replication. The promise resolves to null.
    //
    return text_s.all_p()
    .then(function(text) {
        return login_s.loginfo_p(username_tag, scope, text.loginfo,
                                experiments_s.valid_p)
    })
    .then(function(unpw) {
        if (unpw)
            return experiments_s.replicate(unpw);
        return null;
    })
    .then(
        function good() { return null; },
        function bad() { return null; }    // Ignore any failure
    );
}


(angular.module('tummytrials.replicator',
                [ 'tummytrials.text', 'tummytrials.login',
                  'tummytrials.experiments' ])
.run(function($ionicPlatform, $rootScope, Text, Login, Experiments) {

    function do_replication()
    {
        // We just start replication, don't need to do anything with the
        // returned promise.
        //
        replicate_p($rootScope, Text, Login, Experiments);
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

.factory('Replicator', function($rootScope, Text, Login, Experiments) {
    // A service that does replication on demand.
    //
    return {
        replicate_p: function() {
            // Return a promise to replicate. The promise resolves to
            // null.
            //
            return replicate_p($rootScope, Text, Login, Experiments);
        }
    };
})

);
