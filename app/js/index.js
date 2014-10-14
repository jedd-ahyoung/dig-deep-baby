var base_pricemod = 1.2;
var base_buyback = 0.6;

angular.module('underscore', [])
	.factory('_', function() {
		return window._; // assumes underscore has already been loaded on the page
	});

angular.module('dig', ['ngAnimate', 'underscore'])
	.factory('animate', ['$window', '$rootScope', function($window, $rootScope) {
		// So that polyfill really needs to end up in here.

		if (!Date.now) Date.now = function() { return new Date().getTime(); };

		(function() {
			var vendors = ['webkit', 'moz'];
			for (var i = 0; i < vendors.length && !window.requestAnimationFrame; ++i) {
				var vp = vendors[i];
				window.requestAnimationFrame = window[vp+'RequestAnimationFrame'];
				window.cancelAnimationFrame = (window[vp+'CancelAnimationFrame']
										   || window[vp+'CancelRequestAnimationFrame']);
			}
			if (/iP(ad|hone|od).*OS 6/.test(window.navigator.userAgent) // iOS6 is buggy
				|| !window.requestAnimationFrame || !window.cancelAnimationFrame) {
				var lastTime = 0;
				window.requestAnimationFrame = function(callback) {
					var now = Date.now();
					var nextTime = Math.max(lastTime + 16, now);
					return setTimeout(function() { callback(lastTime = nextTime); },
									  nextTime - now);
				};
				window.cancelAnimationFrame = clearTimeout;
			}
		}());

		var requestAnimationFrame = $window.requestAnimationFrame;

		return function(tick) {
			requestAnimationFrame(function(timestamp) {
				$rootScope.$apply(function () {
					tick(timestamp);  // Nested madness!
				});
			});
		};
	}])

	.directive('display', ['$window', '$document', 'animate', function ($window, $document, animate) {
		/* This directive is solely for view logic. */
		return {
			scope: true,
			restrict: 'A',
			template: [
				'<div class="wrapper"></div>',
				'<div class="horizon" style="background-position: 0px -{{bgPos(depth)}}px;">',
					'<div class="inner" data-depth="{{depth | number:0}}" style="height: {{holeHeight(depth) || \'100%\'}}; width: {{holeWidth()}}px; background-position: 0px -{{bgPos(depth)}}px;">',
						'<div data-ng-repeat="item in displayArray | orderBy:\'$index\':true" class="miniondiv" style="width: {{holeWidth()}}px;">',
							'<span data-ng-repeat="count in ngArray(item.owned) track by $index">',
								'<img data-ng-src="dist/img/{{item.name}}.png" />',
							'</span>',
						'</div>',
					'</div>',
				'</div>'
			].join('\n'),
			link: function (scope, element, attrs) {
				var windowheight = angular.element($window).height();

				scope.holeHeight = function (depth) {
					return (depth * 0.2) < windowheight ? (depth * 0.2) + 'px' : undefined;
				};

				scope.bgPos = function (depth) {
					return (depth * 0.2) < windowheight ? 0 : (depth - windowheight) * 0.2;
				};

				scope.holeWidth = function () {
					return Math.min(700, Math.max(350, _(scope.shop)
						.reduce(function (p, c) {
							return p + c.owned * c.digValue;
						}, 0)
					));
				};

				scope.displayArray = [];

				scope.$watch('shop', function () {
					// This is fucking stupid, need to put ID properties on the shop stuff and make them arrays.
					scope.displayArray = _.values(scope.shop).reverse();
					console.log(scope.displayArray);
				});

				(function tick(timestamp) {
					angular.element($window).scrollTop($document.height());
					animate(tick);
				})();
			}
		};
	}])

	.service('configuration', ['$http', function ($http) {
		return {
			load: function (url, local) {
				return local ? $http.get(url) : $http.get(url);
			}
		};
	}])

	.controller('game', ['$scope', '$timeout', '$document', 'configuration', 'animate', function ($scope, $timeout, $document, configuration, animate) {
		$scope.depth = 0;
		$scope.funds = 0;
		$scope.digValue = 1;

		$scope.shop = {};
		$scope.upgrades = {};
		$scope.achievements = [];

		configuration.load("configuration.json", true)
			.success(function (result) {
				$scope.shop = result.shop;
				$scope.upgrades = result.upgrades;
				$scope.achievements = result.achievements;
			})
			.error(function () {
				console.log("ERROR");
			});

		$scope.currentCost = function (key) {
			return Math.round($scope.shop[key].cost * Math.pow(base_pricemod, $scope.shop[key].owned));
		};

		$scope.dig = function (amt) {
			var digValue = amt || $scope.digValue;
			$scope.funds += digValue;
			$scope.depth += digValue / 5;
		};

		$scope.purchaseShopItem = function (key) {
			if (!key) return;
			
			if ($scope.funds >= $scope.currentCost(key)) {
				$scope.funds -= $scope.currentCost(key);
				$scope.shop[key].owned += 1;
			}
		};

		$scope.sellShopItem = function (key) {
			if (!key) return;

			if ($scope.owned > 0) {
				$scope.funds += Math.round($scope.currentCost(key) * base_buyback);
				$scope.shop[key].owned -= 1;
			}
		};

		$scope.purchaseUpgradeItem = function (key) {
			if (!key) return;

			if ($scope.funds >= $scope.upgrades[key].cost) {
				$scope.$eval($scope.upgrades[key].effect);

				$scope.funds -= $scope.upgrades[key].cost;
				$scope.upgrades[key].enabled = true;
			}
		};

		$scope.showUpgradeItem = function (expression) {
			return $scope.$eval(expression);
		};

		$scope.ngArray = function (number) {
			return new Array(number);
		};

		var counter = 0;
		var oldtime = Date.now();

		// Main game logic here.
		animate(function gameloop(timestamp) {
			var elapsed = timestamp - oldtime;
			oldtime = timestamp;

			var digAmt = _($scope.shop)
				.filter(function (val) { return val.owned; })
				.reduce(function (previous, val) {
					return previous + (val.owned * val.digValue * elapsed * val.cycle);
				}, 0);

			if (digAmt) {
				$scope.dig(digAmt / 1000);
			}

			// Watch the upgrades. Again, MIGHT be better through scope.watch
			_($scope.upgrades)
				.filter(function (val) { return !val.available; })
				.each(function (val) {
					val.available = $scope.$eval(val.unlocks) ? true : false;
				});

			// Check achievements. There is probably a better way to do this via multiple $scope.watches.
			_($scope.achievements)
				.filter(function (val) { return !val.nailed; })
				.each(function (val) {
					val.nailed = $scope.$eval(val.criteria) ? true : false;
				});

			counter++;
			animate(gameloop);
		});
	}]);