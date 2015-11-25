(function() {
    'use strict';

    /**
     * @ngInject
     */
    function AuthService($q, $http, $cookies, $rootScope, $timeout, $window, ASEConfig) {
        var module = {};

        var userIdCookieString = 'AuthService.userId';
        var tokenCookieString = 'AuthService.token';
        var cookieTimeout = null;
        var cookieTimeoutMillis = 24 * 60 * 60 * 1000;      // 24 hours

        var events = {
            loggedIn: 'ASE:Auth:LoggedIn',
            loggedOut: 'ASE:Auth:LoggedOut'
        };

        module.events = events;

        module.isAuthenticated =  function () {
            return !!(module.getToken() && module.getUserId() >= 0);
        };

        module.authenticate = function(auth) {
            var dfd = $q.defer();
            $http.post(ASEConfig.api.hostname + '/api-token-auth/', auth)
            .success(function(data, status) {
                var result = {
                    status: status,
                    error: ''
                };
                if (data && data.user) {
                    setUserId(data.user);
                }
                if (data && data.token) {
                    setToken(data.token);
                }
                result.isAuthenticated = module.isAuthenticated();
                if (result.isAuthenticated) {
                    $rootScope.$broadcast(events.loggedIn);
                } else {
                    result.error = 'Unknown error logging in.';
                }
                dfd.resolve(result);
            })
            .error(function(data, status) {
                var error = _.values(data).join(' ');
                if (data.username) {
                    error = 'Username field required.';
                }
                if (data.password) {
                    error = 'Password field required.';
                }
                var result = {
                    isAuthenticated: false,
                    status: status,
                    error: error
                };
                dfd.resolve(result);
            });

            return dfd.promise;
        };

        module.getToken = function() {
            return $cookies.getObject(tokenCookieString);
        };

        module.getUserId = function() {
            var userId = parseInt($cookies.getObject(userIdCookieString), 10);
            return isNaN(userId) ? -1 : userId;
        };

        module.logout =  function() {
            // TODO: hit logout openid endpoint after clearing cookies to log out of OpenID too,
            // and let it redirect to 'next' GET param
            setUserId(null);
            $cookies.remove(tokenCookieString);
            $rootScope.$broadcast(events.loggedOut);
            if (cookieTimeout) {
                $timeout.cancel(cookieTimeout);
                cookieTimeout = null;
            }
            // trigger full page refresh
            $window.location.reload();
        };

        return module;

        function setToken(token) {
            if (!token) {
                return;
            }

            // clear timeout if we re-authenticate for whatever reason
            if (cookieTimeout) {
                $timeout.cancel(cookieTimeout);
                cookieTimeout = null;
            }

            $cookies.putObject(tokenCookieString, token);

            cookieTimeout = $timeout(function() {
                module.logout();
            }, cookieTimeoutMillis);
        }

        function setUserId(id) {
            var userId = parseInt(id, 10);
            userId = !isNaN(userId) && userId >= 0 ? userId : -1;
            $cookies.putObject(userIdCookieString, userId);
        }
    }

    angular.module('ase.auth').factory('AuthService', AuthService);

})();
