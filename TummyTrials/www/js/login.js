// login.js     Get username/password
//
angular.module('TummyTrials.login', [ 'ionic' ])

.factory('Login', function($q, $ionicModal) {
    return {
        loginfo_p:
            function(storekey, scope, heading) {
                // Return a promise for a username and password. The
                // promise resolves to an object like this:
                //
                //     { username: 'xxx', password: yyy' }
                //
                // The info comes from local storage, or from a user
                // dialog if necessary. The user can cancel the login,
                // in which case the promise resolves to null.
                // 
                // Caller provides the following:
                //
                //     storekey: key for saving results in local store
                //     scope:    scope in which to interact w user
                //     heading:  heading for top of dialog
                //
                // Note: we write some values named loginfo_xxx into the
                // scope.
                // 

                // If info is in local storage, just return it.
                //
                var logjinfo;
                if (logjinfo = window.localStorage.getItem(storekey)) {
                    var def = $q.defer();
                    def.resolve(JSON.parse(logjinfo));
                    return def.promise;
                }

                // Create modal dialog asking for the info.
                //
                var def = $q.defer();
                var opts = { scope: scope };
                scope.loginfo_header_text = heading;
                $ionicModal.fromTemplateUrl('templates/loginfo.html', opts)
                .then(
                    function(modal) {
                        scope.loginfo_info = {};
                        scope.loginfo_login = function() {
                            var info = scope.loginfo_info;
                            if (!(info.username && info.password))
                                // Should indicate problem to user here.
                                //
                                return;
                            var jinfo = JSON.stringify(info);
                            window.localStorage.setItem(storekey, jinfo);
                            modal.remove()
                            .then(function() { def.resolve(info); });
                        };
                        scope.loginfo_cancel = function() {
                            modal.remove()
                            .then(function() { def.resolve(null); });
                        };
                        modal.show();
                    },
                    function(err) {
                        // For now, treat failure as if user canceled.
                        //
                        def.resolve(null);
                    }
                );
                return def.promise;
            },
        loginfo_clear: function(storekey) {
            // Clear any login info stored under the given key.
            //
            window.localStorage.removeItem(storekey);
        }
    };
})
