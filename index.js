var base_pricemod = 1.2;
var base_buyback = .6;

var app = angular.module('dig', ['ngAnimate']);

app.factory('animate', function($window, $rootScope) {
	// So that polyfill really needs to end up in here.

	var requestAnimationFrame = $window.requestAnimationFrame;

	return function(tick) {
		requestAnimationFrame(function(timestamp) {
			$rootScope.$apply(function () {
				tick(timestamp);  // Nested madness!
			});
		});
	};
});

app.directive('display', function ($window, $document, animate) {
	/* This directive is solely for view logic. */
	return {
		scope: true,
		restrict: 'A',
		template: '<div class="wrapper"></div><div class="horizon" style="background-position: 0px -{{bgPos(depth)}}px;"><div class="inner" data-depth="{{depth | number:0}}" style="height: {{holeHeight(depth)}}; width: {{holeWidth()}}px; background-position: 0px -{{bgPos(depth)}}px;"><div data-ng-repeat="(key, item) in shop" class="miniondiv" style="width: {{holeWidth()}}px;"><span data-ng-repeat="count in ngArray(item.owned) track by $index"><img data-ng-src="img/{{item.name}}.png" /></span></div></div></div>',
		link: function (scope, element, attrs) {
			var windowheight = angular.element($window).height();
			
			scope.holeHeight = function (depth) {
				return (depth * .2) < windowheight ? Math.floor(depth * .2) + 'px' : "100%";
			};
			
			scope.bgPos = function (depth) {
				return (depth * .2) < windowheight ? 0 : Math.floor((depth - windowheight) * .2);
			};
		
			scope.holeWidth = function () {
				var width = 0;
				for (var prop in scope.shop) {
					if (scope.shop.hasOwnProperty(prop)) {
						width += scope.shop[prop].owned * scope.shop[prop].digValue; // Need to temper this with digValue.
					}
				}		
				
				if (width < 350) width = 350;
				return (width > 700 ? 700 : width);
			};
			
			(function tick() {
				angular.element($window).scrollTop($document.height());
				animate(tick);
			})();
		}
	}
});

app.service('configuration', function ($http) {
	return {
		load: function (url, local) {
			if (local) {
				return $http.get(url);
			} else {
				return $http.get(url);	
			}
		}
	}
});

app.controller('game', function ($scope, $timeout, $document, configuration, animate) {
	$scope.depth = 0;
	$scope.funds = 10000000000;
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
		if (!key) {
			return;
		}
		
		if ($scope.funds >= $scope.currentCost(key)) {
			$scope.funds -= $scope.currentCost(key);
			$scope.shop[key].owned += 1;
		}
	};
	
	$scope.sellShopItem = function (key) {
		if (!key) {
			return;
		}
		
		if ($scope.owned > 0) {
			$scope.funds += Math.round($scope.currentCost(key) * base_buyback);
			$scope.shop[key].owned -= 1;
		}
	};
	
	$scope.purchaseUpgradeItem = function (key) {
		if (!key) {
			return;
		}
		
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
	
		// TODO: inject underscore.
		for (var prop in $scope.shop) {
			if ($scope.shop.hasOwnProperty(prop)) {
				for (var i = 0; i < $scope.shop[prop].owned; i++) {
					$scope.dig($scope.shop[prop].digValue * elapsed * $scope.shop[prop].cycle / 1000);
				}
			}
		}
		
		// Watch the upgrades. Again, MIGHT be better through scope.watch
		for (var prop in $scope.upgrades) {
			if ($scope.upgrades.hasOwnProperty(prop)) {
				if (!($scope.upgrades[prop].available) && $scope.$eval($scope.upgrades[prop].unlocks)) {
					$scope.upgrades[prop].available = true;
				}
			}
		}
		
		// Check achievements. There is probably a better way to do this via multiple $scope.watches.
		for (var prop in $scope.achievements) {
			if ($scope.achievements.hasOwnProperty(prop)) {
				if (!($scope.achievements[prop].nailed)) {
					if ($scope.$eval($scope.achievements[prop].criteria)) {
						$scope.achievements[prop].nailed = true;
						console.log("Nailed it!");
					}
				}
			}
		}

		counter++;
		animate(gameloop);
	});
});