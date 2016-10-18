var ver = "1.2.6";
//设置通知永久音量。
document.getElementById('notification').volume = 0.4;
(function(){
  'use strict';
  angular
	.module('nullchat', ['ngMaterial', 'firebase', 
						 'ui.router', 'luegg.directives', 
						 'ngHolder', 'angularMoment', 'ngSanitize',
						 'ngFileUpload',
						 'angulartics', 'angulartics.google.analytics']
	)
	.run(['$rootScope', '$mdSidenav', function($rootScope, $mdSidenav) {
		$rootScope.$on('$stateChangeSuccess', 
		function(event, toState, toParams, fromState, fromParams){
				if(toState.name == 'chat') {
					if(!$mdSidenav('left').isLockedOpen() && $mdSidenav('left').isOpen()) {
						$mdSidenav('left').close();
					}
				}
		})
		//启动应用程序运行时看。默认情况下也将启动存活服务。
	}])
	.config(['$mdThemingProvider', '$mdIconProvider', '$urlRouterProvider', '$stateProvider', '$analyticsProvider', function($mdThemingProvider, $mdIconProvider, $urlRouterProvider, $stateProvider, $analyticsProvider){
		function loadApp(NCService) {
		  		return NCService.init();
		}
		loadApp.$inject = ['NCService'];
		$urlRouterProvider.otherwise("/");
		// 现在成立了状态
		$stateProvider
		.state('dashboard', {
		  url: "/",
		  templateUrl: "views/dashboard.html", 
		  resolve : {
		  	loadApp : loadApp
		  }
		})
		.state('chat', {
		  url: "/:chatId",
		  templateUrl: "views/chatbox.html",
		  controller: 'ChatBoxController',
		  controllerAs : 'cb', 
		  resolve : {
		  	loadApp : loadApp,	
		  	chatValid : ['NCService', '$stateParams', '$rootScope', function(NCService, $stateParams, $rootScope) {
		  		$rootScope.loadingActivity = true;//$ rootScope装载活动=真
		  		return NCService.loadChatData($stateParams.chatId);
		  	}]
		  }
		});
		$mdIconProvider
		  .defaultIconSet("./assets/svg/avatars.svg", 128)
		  .icon("menu"       , "./assets/svg/menu.svg"        , 24)
		  .icon("share"      , "./assets/svg/share.svg"       , 24)
		  .icon("google_plus", "./assets/svg/google_plus.svg" , 512)
		  .icon("hangouts"   , "./assets/svg/hangouts.svg"    , 512)
		  .icon("twitter"    , "./assets/svg/twitter.svg"     , 512)
		  .icon("phone"      , "./assets/svg/phone.svg"       , 512);
		$mdThemingProvider.theme('default')
		  .primaryPalette('blue')
		  .accentPalette('teal');
        $analyticsProvider.firstPageview(true); /* 不使用$状态记录页面或 $route */
        $analyticsProvider.withAutoBase(true);  /* 记录完整路径 */
	}])
	//这个指令带来的向下滚动向上时infitinelty滚动。
	.directive('execOnScrollToTop', ['$timeout', function ($timeout) {
		return {
			restrict: 'A',
			link: function (scope, element, attrs) {
				var container = angular.element(element);
				var fn = scope.$eval(attrs.execOnScrollToTop);
				container.bind('scroll', function (e) {
					if (e.target.scrollTop <= 0) {
						console.log('做这件事...');
						var hasNext = scope.$apply(fn);
						if(hasNext) {
							scope.scrollLoading = true;
							var prevHeight = element[0].scrollHeight;
							var listenerHeight = scope.$watch(function() {
								return element[0].scrollHeight;
							}, function(newValue, oldValue, scope) {
								if(newValue != oldValue) {
									element[0].scrollTop = element[0].scrollHeight - prevHeight;
									listenerHeight();
									$timeout(function() {
										scope.scrollLoading = false;
									})
								}
							});
						}
					}
				});
			}
		};
	}]);
})();
(function(){
  angular
       .module('nullchat')
       .controller('NCController', NCController )
       .controller('UserNameChangeController', UserNameChangeController )
       .controller('ChatDialogController', ChatDialogController )
       .controller('ChatBoxController', ChatBoxController );
  /**
   * 对角材质入门应用主控制器
   * @param $scope
   * @param $mdSidenav
   * @param avatarsService
   * @constructor
   */
  function NCController( NCService, $q, $scope, $sce, $rootScope, $window, $mdSidenav, $stateParams, $mdDialog) {
    var self = this;
    self.getUserName = getUserName;//用户名
    self.toggleList = toggleList;//切换列表
    self.createChat = createChat;//创建聊天室
    self.getChatList = getChatList;//获得聊天列表
    self.newMessageCount = newMessageCount;//新的消息计数
    self.showNameDialog = showNameDialog;//展会名称对话框
    self.showTotalUnreadCount = showTotalUnreadCount;//显示未读的总次数
    self.chatLoaded = chatLoaded;//加载聊天
    self.getChatName = getChatName;//获得聊天名称
    var idle = new $window.Idle();
    idle.onAway = function() {//idle.on客场
      if($stateParams.chatId) {//如果（状态参数聊天标识）
        NCService.setUserIdle(true, $stateParams.chatId)//如果（$状态参数 chatId）{NC服务设置用户空闲（真实的，状态参数。聊天ID）
      }
    };
    idle.onAwayBack = function() {
      if($stateParams.chatId) {
        NCService.resetUnreadCount($stateParams.chatId);//NC服务重置未读计数（状态参数聊天标识）
        NCService.setUserIdle(false, $stateParams.chatId);//NC服务设置用户空闲（假，状态参数聊天标识）
      }
    };
    idle.setAwayTimeout(5000);//idle.set客场超时（5000）
    idle.start();
    function chatLoaded(chatId) {//加载聊天（聊天标识）
      return NCService.isChatLoaded(chatId);//返回NC服务是加载聊天（聊天标识）
    }
    function showTotalUnreadCount() {//功能显示未读的总次数（）
      var total = 0;
      angular.forEach($rootScope.chats, function(value, chatId){
        total += $rootScope.chats[chatId].unreadCount;
      });
      var title = '在线聊天';
      if(total>0){
        title = '('+total+') ' + title; 
      }
      return $sce.trustAsHtml(title);//返回$ SCE信任为HTML（标题）
    }
    function toggleList() {
        $mdSidenav('left').toggle();
    }
    function showNameDialog(ev) {
      $mdDialog.show({
        targetEvent: ev,
        templateUrl : "views/nameDialog.html",
        clickOutsideToClose : true,
        preserveScope : true,
        bindToController : true,
        controller: 'UserNameChangeController',//控制器：“用户名更改控制器”
        controllerAs : 'nc',
      });
    }
    function createChat() {//创建聊天室
      NCService.createChat();//创建聊天室
    }
    function getChatList() {//获得聊天列表
      return NCService.getChatList();//放 nc服务.获得聊天列表
    }
    function getUserName() {//功能 获得用户名
      return NCService.getUser().name;//返回 nc服务 获得用户().名
    }
    function newMessageCount(chatId) {//功能新消息内容聊天id
      if($stateParams.chatId === chatId) {//如果状态参数. 聊天ID 等于聊天ID
        return null;//返回空
      } else {//否则
        return NCService.newMessageCount(chatId);// 返回 nc服务 .新消息内容(聊天ID)
      }
    }
    function getChatName(chatId) {//功能 获得聊天名称(聊天id)
      if(NCService.getChat(chatId)) {//如果 nc服务获得聊天(聊天ID)
        return NCService.getChat(chatId).meta.name;//返回 nc服务.获得聊天(聊天id).元 名称
      } else {
        return chatId;
      }
    }
  }
  NCController.$inject = ['NCService', '$q', '$scope', '$sce', '$rootScope', '$window', '$mdSidenav', '$stateParams', '$mdDialog'];
  function UserNameChangeController(NCService, $mdDialog, $rootScope) {
    var self = this;
    self.userName = NCService.getUser().name;//用户名= NC服务获得用户（）的名称。
    self.closeDialog = closeDialog;
    self.changeUserName = changeUserName;//更改用户名=更改用户名;
    self.authUser = authUser;
    self.authState = NCService.getAuthState('google');
    self.logoutUser = logoutUser;
    self.showProfileImage = NCService.getUserSettings('showProfileImage');
    self.saveSettings = saveSettings;
    console.log(self.authState);
    function saveSettings() {
    }
    function closeDialog() {
      $mdDialog.cancel(); 
    }
    function changeUserName() {
      NCService.changeUserName(self.userName);
      $mdDialog.cancel(); 
    }
    function logoutUser() {
      NCService.logoutUser().then(function() {
        NCService.goHome();
        $mdDialog.cancel(); 
      });
    }
    function authUser(loginProvider) {
          NCService.authUser(loginProvider).then(function() {
            NCService.goHome();
            self.closeDialog();
          }, function() {
            alert('登录失败!');
            self.closeDialog(); 
          });
      }
  }
  UserNameChangeController.$inject = ['NCService', '$mdDialog', '$rootScope'];//用户名更改控制器。$注= ['服务'，'$ MD对话框“，”$ rootScope']
  function ChatDialogController(NCService, $stateParams, $mdDialog) {//功能图对话框控制（服务，$状态参数，$ MD对话框）
    var self = this;
    self.chatId = $stateParams.chatId;//状态参数.聊天ID
    self.chatName = NCService.getChat(self.chatId).meta.name;//自聊天名称= NC服务获得聊天（self.chat编号）.META名
    console.log(this);
    self.closeDialog = closeDialog;//关闭对话框
    self.changeChatName = changeChatName;//更改聊天名称
    /** Functions */
    function changeChatName() {
      NCService.changeChatName(self.chatId, self.chatName);//NC服务更改聊天名称（自我聊天标识，自我聊天名称）
      self.closeDialog();//关闭对话框
    }
    function closeDialog() {
      $mdDialog.hide();
    }
  }
  ChatDialogController.$inject = ['NCService', '$stateParams', '$mdDialog'];
  function ChatBoxController(NCService, $timeout, $mdDialog, $stateParams, $rootScope, $q, chatValid, $state, $location, $window) {
      var self = this;
      self.chatId = $stateParams.chatId;
      self.uploadProgress = 0;//上传进度
      if(chatValid == false) {
        NCService.leaveChat(self.chatId);
        $state.transitionTo('dashboard');
      }
      $rootScope.loadingActivity = false;
      self.chatValid = chatValid;// 聊天值id
      self.sendChat = sendChat;//提交聊天
      self.getChatData = getChatData;//获得聊天数据
      self.showOwner = showOwner;//显示聊天所有者
      self.changeTypingStatus = changeTypingStatus;//改变打字状态
      self.showTypingStatus = showTypingStatus;//显示打字状态
      self.genUserBg = genUserBg;//根用户BG
      self.leaveChat = leaveChat;//离开聊天
      self.showShareModal = showShareModal;//显示分享模态
      self.resetUnreadCount = resetUnreadCount;//重置未读计数
      self.removeFocus = removeFocus;//移除焦点
      self.uploadFile = uploadFile;//上传文件
      self.handleKeyDown = handleKeyDown;//处理KEYDOWN
      self.openChatMenu = openChatMenu;//打开聊天菜单
      self.renameChat = renameChat;//删除聊天室
      self.isChatOwner = isChatOwner;//是业主聊天
      self.imageSrc = imageSrc;//图片输出
      self.handleScrollToTop = handleScrollToTop;//处理滚动到顶部
      self.holderThemes = [ 'sky', 'vine', 'lava', 'industrial', 'social' ];//
      self.userBgColors = {};//自用户bg颜色
      self.menuOriginatorEv = null;//菜单发起者开发= 空
      /** Functions */
      function handleScrollToTop() {//滚动到顶部
        return NCService.initChatData(self.chatId, true);
      }
      function isChatOwner() {
        return NCService.isChatOwner(self.chatId);
      }
      function openChatMenu($mdOpenMenu, ev) {
        self.menuOriginatorEv = ev;
        $mdOpenMenu(ev);
      }
      function renameChat() {//重命名聊天室
        $mdDialog.show({
          targetEvent: self.menuOriginatorEv,//目标事件：自创始菜单EV
          clickOutsideToClose: true,//点击触发关闭
          preserveScope : true,
          bindToController : true,
          templateUrl : "views/chatDialog.html",
          controller: 'ChatDialogController',
          controllerAs : 'cd',
       });
      }
      function resetUnreadCount(chatId) {
        NCService.resetUnreadCount(self.chatId);
      }
      function removeFocus() {
        document.getElementById('chatText').blur();//文件获得通过元素的ID（'聊天文本“）。模糊
      }
      function uploadFile(file) {//上传文件（文件）
        if(!file) {//如果
          return;
        }
        self.uploadProgress = 10; //初始化进度圆
        NCService.uploadFile(file).then(//NC服务上传文件（文件）,然后
          function(resp) {//分别为
            console.log(resp.data);//控制台日志（RESP数据）
            if(resp.data && resp.data.data && resp.data.data.link) {//如果（RESP数据&& 分别为数据数据&& 分别为数据的数据链路
              //切换到安全链接！
              NCService.appendArray(self.chatId, 'image', resp.data.data.link);//NC服务附加阵列自聊天身份证，“形象”，分别为数据的数据链路）
            }
            self.uploadProgress = 0;
          },
          function(resp) {
            console.log(resp);
            alert('图片上传失败');
            self.uploadProgress = 0;//上传进度=0
          }, function (evt) {
            self.uploadProgress = parseInt(100.0 * evt.loaded / evt.total);//上传进度= parseInt函数（100.0* EVT加载/总EVT
          }
        );
      }
      function imageSrc(url) {
        if(!url) {
          return url;
        }
        if(typeof URL == 'function') {
          var img_host = new URL(url).hostname;
          if(img_host === 'i.imgur.com') {
            var newURL = url.replace('http://','https://');
            newURL = newURL.replace(/\.(jpg|png|gif|jpeg)$/i,'m.$1');
            return newURL;
          } else {
            return url;
          }
        } else {
          return url;
        }
      }
      function showShareModal() {
        alert = $mdDialog.alert({
          title: '分享',
          textContent: $location.absUrl(),
          ok: '确定'
        });
        $mdDialog
          .show( alert )
          .finally(function() {
          });
      }
      function genUserBg(uid) {
        if(self.userBgColors[uid] === undefined) {
          self.userBgColors[uid] = self.holderThemes.shift();
          self.holderThemes.push(self.userBgColors[uid]);
        }
        return self.userBgColors[uid];
      }
      function loadUserInfo() {
        NCService.loadUserInfo(self.chatId);
      }
      function leaveChat() {
        NCService.leaveChat(self.chatId);
      }
      function sendChat() {
        if(self.chatText) {
          NCService.appendArray(self.chatId, 'text', self.chatText);
          self.chatText = ""; 
          self.changeTypingStatus(self.chatId, 'remove');
        }
      }
      function handleKeyDown(e) {
        var self = this;
        if(e.keyCode == 13 && !e.shiftKey) {
          self.sendChat();
          e.preventDefault();
        } 
      }
      function getChatData() {
        return NCService.getChatData(self.chatId);
      }
      function showOwner(uid) {
        return NCService.showOwner(self.chatId, uid);
      }
      function changeTypingStatus() {
        var action = 'add';
        if(!self.chatText) {
          action = 'remove';
        }
        NCService.changeTypingStatus(self.chatId, action);
      }
      function showTypingStatus() {
        return NCService.showTypingStatus(self.chatId);
      }
  }
  ChatBoxController.$inject = ['NCService', '$timeout', '$mdDialog', '$stateParams', '$rootScope', '$q', 'chatValid', '$state', '$location', '$window'];
})();
(function(){
  'use strict';
  angular.module('nullchat')
         .service('NCService', NCService);
  /**
   * 用户数据服务
   * 采用嵌入式，硬编码的数据模型;异步行为模拟
   * 远程数据服务调用(s).
   *
   * @returns {{loadAll: Function}}
   * @constructor
   */
  function NCService($q, $analytics, $firebaseArray, $firebaseObject, $firebaseAuth, $rootScope, $stateParams, $state, $mdToast, Upload){
    var states = { INIT: 0, RUNNING : 1, LOADED: 2 };
    // 基于承诺的API
    return {
      syncObject : { user : null, users : {} , chats : {} },
      uid : 0,
      fbRef : null,
      authObj: null,
      chats : [],
      fbData : null, 
      metaUsers : {},
      userIdle : false, 
      makeid : function(length) {
          var text = "";
          var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
          for( var i=0; i < length; i++ )
              text += possible.charAt(Math.floor(Math.random() * possible.length));
          return text;
      },
      initRootScope : function() {
        $rootScope.users = {};
        $rootScope.chats =  {};
      },
      authAnonymous : function(cb) {//自动匿名:功能cb
        var self = this;
        self.fbRef.authAnonymously(cb);//fb读.自动匿名 检定(cb)
      },
      init : function(bindObj) {//初始化绑定OBJ
        var self = this;
        var def = $q.defer();
        //初始化状态
        if($rootScope.currentState === undefined) {
          self.initRootScope();
          $rootScope.loadingActivity = true;
          $rootScope.currentState = states.INIT;
        }
        if($rootScope.currentState == states.LOADED) {
          def.resolve(self.fbRef);
        }
        if($rootScope.currentState == states.INIT) {
          $rootScope.currentState = states.RUNNING;
          self.fbRef = new Firebase("https://glowing-inferno-7011.firebaseio.com/");
          self.authObj = $firebaseAuth(self.fbRef);
          self.authObj.$onAuth(function(authData) {
            console.log('登录了');
            console.log(authData);
            if(authData) {
              //破坏上一页对象
              if(self.syncObject.user && self.syncObject.user.$value)
                self.syncObject.user.$destroy();
              if(Object.keys($rootScope.chats).length) {
                for(var chatId in $rootScope.chats) {
                  if(self.syncObject.chats[chatId] && self.syncObject.chats[chatId].$value)
                    self.syncObject.chats[chatId].$destroy();
                }
              }
              self.uid = authData.uid;
              self.initData().then(function() {
                if(authData.provider === 'google') {
                  $rootScope.user.auth = authData.auth;
                }
                def.resolve(self.fbRef);
              });
            } else {
              console.log('登录改变，没有了UID');
            }
          });
          self.authObj.$waitForAuth().then(function(authData) {
            if(authData && authData.expires) {
              var d = new Date();
              var n = d.getTime();
              var sessionTimeout = authData.expires*1000;
              var remainingTime = (authData.expires*1000 - n)/60000;
            }
            if(!authData || remainingTime < 0) {
              self.authAnonymous(function(error, authData) {
                if (error) {
                  console.log("登录失败!!!", error);
                } else {
                  console.log("有效载荷成功验证：", authData);
                }
              })
            } else {
            }
          })
        }
        return def.promise;
      },
      changeUserName : function(name) {
        name = name.trim();
        if(name && name.toUpperCase() != '你' 
            && name.toUpperCase() != 'ADMIN' 
            && name.toUpperCase().indexOf('FUCK') === -1) {
          $rootScope.user.meta.name =  name ;
        }
      },
      initStructUser : function() {//初始化结构体用户 功能
        var self = this;
        if($rootScope.user.meta === undefined) {//如果元根用户范围===元未定义
            $rootScope.user.meta = {};//根范围用户元=
            self.changeUserName("用户" + self.makeid(5));//更改用户名（“用户”+自主制造ID
        }
        if($rootScope.user.auth === undefined) {//如果远用户.自动 等于 未定义
            $rootScope.user.auth = {};
        }
        if($rootScope.user.settings === undefined) {
            $rootScope.user.settings = {};
        }
        if($rootScope.user.chats === undefined) {
            $rootScope.user.chats = { own : [], shared : [] };
        }
      },
      initData : function() {
        var self = this;
        var def = $q.defer();
        console.log(self.uid);
        if(self.syncObject.user && self.syncObject.user.$value)
        self.syncObject.user.$destroy();
        self.syncObject.user = $firebaseObject(self.fbRef.child('users').child(self.uid));
        self.syncObject.user.$bindTo($rootScope, "user");
        self.syncObject.user.$loaded(function(value) {
          console.log('user loaded ' + self.uid);
          //初始用户名和自己/共享列表
          self.initStructUser();
          $rootScope.loadingActivity = false;
          $rootScope.currentState = states.LOADED;
          def.resolve(self.fbRef);
        });
        return def.promise;
      },
      isNcdataInit: function() {
        return $rootScope.user !== undefined;//返回$根Scope.user==未定义！;
      },
      initStructChat : function(chatId) {//初始化结构体聊天
      },
      getUser : function() {
        var self = this;
        if(self.isNcdataInit()) {
          return { name: $rootScope.user.meta.name };
        } else {
          return { name: '' };
        }
      },
      createChat : function() {//创建聊天室
        var self = this;
        var chatId = this.makeid(10);//聊天室ID等于自动生成10个字符串
        if($rootScope.user.chats.own === undefined) {//如果根用户聊天===未定义
         $rootScope.user.chats.own = [];
        }
        $rootScope.user.chats.own.push(chatId);
        //创建空的聊天对象
        var chatEmptyObj = {
          meta : {
            name: chatId,
            created: Firebase.ServerValue.TIMESTAMP, 
            owner: self.uid,
          },
          data : {
            desc : "聊天数据",
            sharedWith : [],
            typing :  []
          },
          array : []
        };
        self.fbRef.child('chats').child(chatId).set(chatEmptyObj, function() {
          $analytics.eventTrack('chat-create', {  category: 'chat', label: chatId });
          $state.transitionTo('chat', { chatId : chatId});
        });
      },
      getChatList : function() {
        var self = this;
        if(self.isNcdataInit()) {
          return $rootScope.user.chats;
        }
        else
          return [];
      },
      showOwner : function(chatId, uid) {
        var self = this;
        if(self.uid == uid)
          return  "您" ;
        else {
          if($rootScope.users[uid] !== undefined) {
            return $rootScope.users[uid].name;
          } else  {
            self.loadUserInfo(chatId);
          } 
        }
      },
      getCurTimestamp : function() {
        var d = new Date();
        return d.getTime();
      },
      changeTypingStatus : function(chatId, action) {
        var self = this;
        if($rootScope.chats[chatId].data.$value === null) {
          return;
        }
        if(self.isNcdataInit()) {
          if($rootScope.chats[chatId].data.typing === undefined || Array.isArray($rootScope.chats[chatId].data.typing)) {
            $rootScope.chats[chatId].data.typing = {};
          }
          if(($rootScope.chats[chatId].data.typing[self.uid] === undefined || $rootScope.chats[chatId].data.typing[self.uid] === false) && action == 'add') {
            $rootScope.chats[chatId].data.typing[self.uid] = self.getCurTimestamp();
          }
          if($rootScope.chats[chatId].data.typing[self.uid] !== undefined && action == 'remove') {
            $rootScope.chats[chatId].data.typing[self.uid] = false;
          }
        }
      },
      showTypingStatus : function(chatId) {//显示打字状态：功能（聊天标识）{
        var self = this;
        if(self.isNcdataInit()) {
          if($rootScope.chats[chatId].data.typing !== undefined) {
            if(Object.keys($rootScope.chats[chatId].data.typing).length > 0 ) {
              self.typing = [];
              angular.forEach($rootScope.chats[chatId].data.typing, function(timestamp, uid){
                if(uid !== self.uid && (self.getCurTimestamp() - timestamp < 10000) ) {
                  if(self.showOwner(chatId, uid))
                    self.typing.push(self.showOwner(chatId, uid));
                }
              });
              if(self.typing.length > 1) {
                self.typing = self.typing.join(', ') + ' 是打字';
              } else if(self.typing.length == 1) {
                self.typing = self.typing[0] + ' 在打字';
              } else {
                self.typing = '';
              }
              return self.typing;
            } else {
              return '';
            }
          }
        }
      },
      addUserToChat : function(chatId) {//将用户添加到聊天：功能（聊天标识
        var self = this;
        var isJoined = false;
        //如果当前用户不拥有chatId然后将其添加到用户的 "shared" 列表
        // ... 并将其添加到 "shareWith" 阵列中的聊天数据。
        if($rootScope.chats[chatId].meta.owner !== self.uid) {
          if($rootScope.user.chats.shared === undefined) {
           $rootScope.user.chats.shared = [];
          }
          if($rootScope.user.chats.shared.indexOf(chatId) == -1) {
            isJoined = true;
            $rootScope.user.chats.shared.push(chatId);
          }
        } 
        //加上本人或共享的家伙到列表
        if($rootScope.chats[chatId].data.sharedWith === undefined) {
         $rootScope.chats[chatId].data.sharedWith = {};
        }
        $rootScope.chats[chatId].data.sharedWith[self.uid] = true;
        return isJoined;
      },
      isInit : function() {
        var def = $q.defer();
        var self = this;
        var removeCheck = $rootScope.$watch("currentState", function(currentState) {//VAR删除检查= $根范围。$表（“当前状态”功能（当前状态）
          if(currentState == states.LOADED) {//
            removeCheck();
            def.resolve();
          }
        })
        return def.promise;
      },
      destroyAFObj : function(AFObj) {
        if(AFObj && AFObj.$id) {
          AFObj.$destroy();
        }
      },
      initRootObj : function(rootObj, fieldID) {//初始化根的OBJ：功能（根OBJ，域ID）{
        if(rootObj[fieldID] === undefined)//如果（根的OBJ[ID字段]===未定义
          rootObj[fieldID] = {};
      },
      loadUserInfo : function(chatId) {//加载用户信息
        var self = this;
        var sharedWith = $rootScope.chats[chatId].data.sharedWith;//VAR共享凭借= $根范围内的聊天记录[chat_Id]。数据共享利用
        angular.forEach(sharedWith, function(value, uid){//角。为每一个（共享带，功能（价值，UID）
          if($rootScope.users[uid] === undefined) {//如果（$根Scope.users[UID]===未定义）
            $rootScope.users[uid] = { name : '..' };//$根Scope.users[UID] = {名称：'用户'}
            self.syncObject.users[uid] = $firebaseObject(self.fbRef.child('users').child(uid).child('meta'));//self.sync Object.users[UID] = $火力对象（self.fb Ref.child（'用户'）。子女（UID）.child（“元”））
            self.syncObject.users[uid].$bindTo($rootScope, "users['" + uid + "']" );
            //加载方法
            self.syncObject.users[uid].$loaded(function(value) {//自同步对象的用户[UID]$加载（函数（值）
            });
          }
        });
      },
      isChatLoaded: function(chatId) {//正在聊天加载：功能（chatId）
        var self = this;
        if(self.isNcdataInit()) {
          return $rootScope.chats[chatId] !== undefined && $rootScope.chats[chatId].meta !==undefined && $rootScope.chats[chatId].data !== undefined;//返回$根范围聊天[聊天ID]！==未定义&& $ rootScope.chats[chat_Id].META！==未定义&& $根Scope.chats[聊天ID]。数据！==未定义
        } else {
          return false;
        }
      },
      newMessageCount : function(chatId) {//新邮件数：功能（聊天标识）{
        if($rootScope.chats[chatId] !== undefined && $rootScope.chats[chatId].unreadCount !== undefined) {//如果（$根的范围聊天[聊天ID]不等于未定义&& $根范围聊天[聊天ID]未读邮件数！==未定义）
          return $rootScope.chats[chatId].unreadCount;//返回$根范围的聊天记录[chat_Id]未读邮件数
        } else
          return '';//否则返回空
      },
      freeChatMem : function(chatId) {
        var self = this;
        self.syncObject.chats[chatId].data.$destroy();
        self.syncObject.chats[chatId].meta.$destroy();
        $rootScope.chats[chatId].array.$destroy();
      },
      leaveChat : function(chatId) {
        var self = this;
        var isChatOwner = false;
        if($rootScope.chats[chatId].meta === undefined) {
          $mdToast.show($mdToast.simple().position('top right').textContent('聊天室未找到'));
          if($rootScope.user.chats.own.indexOf(chatId) != -1)
              $rootScope.user.chats.own.splice($rootScope.user.chats.own.indexOf(chatId), 1);
          return;
        } else {
          isChatOwner = $rootScope.chats[chatId].meta.owner === self.uid;
        }
        if(isChatOwner) {
          console.log('你是这个聊天的主人');
          self.fbRef.child('chats').child(chatId).remove(function() {
            console.log('deleted');
            self.freeChatMem(chatId);
            if($rootScope.user.chats.own.indexOf(chatId) != -1)
              $rootScope.user.chats.own.splice($rootScope.user.chats.own.indexOf(chatId), 1);
            $mdToast.show($mdToast.simple().position('top right').textContent('聊天室已删除!'));
            $state.transitionTo('dashboard');
          })
        } else {
          if($rootScope.chats[chatId].data.sharedWith !== undefined && $rootScope.chats[chatId].data.sharedWith[self.uid] !== undefined)//如果（$根Scope.chats[聊天ID]。数据有了！==未定义&& $ rootScope聊天[聊天ID]。数据使用[自UID]分享分享！==未定义）
            delete $rootScope.chats[chatId].data.sharedWith[self.uid];
          if($rootScope.user.chats.shared.indexOf(chatId) != -1) {
            self.appendArray(chatId, 'status', 'left').then(function() {
              self.freeChatMem(chatId);
            });
            $rootScope.user.chats.shared.splice($rootScope.user.chats.shared.indexOf(chatId), 1);
          }
          $mdToast.show($mdToast.simple().position('top right').textContent('你是这个聊天中不再'));
          $state.transitionTo('dashboard');
        }
      },
      playNotification : function() {//播放通知：功能()
        document.getElementById('notification').play();
      },
      resetUnreadCount : function(chatId) {//重置未读计数：功能（chatId）
        $rootScope.chats[chatId].unreadCount = 0;//{$根范围内的聊天记录[chat_Id].unread计数= 0; }，
      },
      goHome : function() {//
        $state.transitionTo('dashboard');
      },
      setUserIdle : function(isIdle, chatId) {
        var self = this;
        self.userIdle = isIdle;
      },
      initChatData : function(chatId, loadMore) {//初始化字符数据：功能（chatId，加载更多
        var self = this;
        var arrayLength = 200;//VAR数组长度=200
        if(loadMore) {
          var hasNext = self.syncObject.chats[chatId].arrayRef.scroll.hasNext();
          if(hasNext)
            self.syncObject.chats[chatId].arrayRef.scroll.next(arrayLength);
        } else {
          //添加用户聊天（共享聊天）
          var isJoined = self.addUserToChat(chatId);// VAR已加入= self.add用户要聊天（聊天标识）
          //创建一个特殊的滚动裁判
          self.syncObject.chats[chatId].arrayRef = new Firebase.util.Scroll(self.fbRef.child('chats').child(chatId).child("array"), 'invertedTimestamp');
          // 生成裁判同步阵列
          $rootScope.chats[chatId].array = $firebaseArray(self.syncObject.chats[chatId].arrayRef);
          self.syncObject.chats[chatId].arrayRef.scroll.next(arrayLength);
          var hasNext = self.syncObject.chats[chatId].arrayRef.scroll.hasNext();
          $rootScope.chats[chatId].array.$loaded(function() {
            if(isJoined) {
              self.appendArray(chatId, 'status', '加入');//自追加数组（聊天身份证，“状态”，“加入'）;
            }
            $rootScope.chats[chatId].array.$watch(function(eventObj, arrayItem) {//$根范围聊天[聊天ID].array$匹配（函数（事件OBJ，数组项）
              if(eventObj.event === 'child_added') {//如果（事件的OBJ事件===“添加子”）
                if($stateParams.chatId !== undefined && ($stateParams.chatId !== chatId || self.userIdle == true )) {//如果（状态$参数聊天标识！==未定义&&（$状态参数聊天标识！==聊天标识||自用户空闲==真
                  var childAdded = $rootScope.chats[chatId].array.$getRecord(eventObj.key);//VAR添加子= $根范围内的聊天记录【聊天ID].array。$得到记录（事件的OBJ键）
                  if(self.userIdle == true && childAdded.type && childAdded.type !== 'status') {
                    self.playNotification();
                  }
                  $rootScope.chats[chatId].unreadCount +=1;//$根范围的聊天记录[chat_Id]未读邮件数+ = 1;
                }
              }
            });
          })
        }
        return hasNext;
      },
      loadChatData : function(chatId) {
        var self = this;
        var def = $q.defer();
        if($rootScope.chats[chatId] !== undefined && $rootScope.chats[chatId].data !== undefined) {
          $rootScope.chats[chatId].unreadCount = 0;
          def.resolve(true);
          return def.promise;
        }
       //加载数据
          self.initRootObj(self.syncObject.chats, chatId);//self.init根的OBJ（个体经营同步对象的聊天记录，聊天标识）
          self.initRootObj($rootScope.chats, chatId);//初始化根的OBJ（$根范围内的聊天记录，聊天标识）
          $rootScope.chats[chatId].unreadCount = 0;//根范围聊天[聊天ID]未读邮件数=0
          self.syncObject.chats[chatId].data = $firebaseObject(self.fbRef.child('chats').child(chatId).child("data"));//同步对象的聊天记录[聊天ID]数据=$火力对象（个体经营FB参考子（'聊天'）子（聊天标识）子（“数据”））
          self.syncObject.chats[chatId].data.$bindTo($rootScope, "chats['" + chatId + "'].data" );//同步Object.chats[聊天ID]。数据。$绑定（$ rootScope，“聊天记录['”+聊天编号+“']。数据”...
          //加载方法
          self.syncObject.chats[chatId].data.$loaded(function(value) {//同步对象的聊天记录【聊天ID]。数据。$装载机（函数（值）...
            console.log('聊天数据加载');
            if($rootScope.chats[chatId].data.desc !== undefined) {//如果（$根范围内的聊天记录【聊天ID]。数据说明不等于未定义
              self.syncObject.chats[chatId].meta = $firebaseObject(self.fbRef.child('chats').child(chatId).child("meta"));//同步对象的聊天记录【聊天ID].META= $火力对象（个体经营FB Ref.chi LD（'聊天'）子（聊天标识）志LD（“元”））
              self.syncObject.chats[chatId].meta.$bindTo($rootScope, "chats['" + chatId + "'].meta" );//同步对象的聊天记录【聊天ID]元$绑定（$ rootScope，“聊天记录['”+聊天编号+“']元”
              self.syncObject.chats[chatId].meta.$loaded(function(value) {//同步对象的聊天记录【聊天ID]加载元$（函数（值）
                  console.log('聊天元装');
                  self.initChatData(chatId, false);//初始化CHAR数据（聊天身份证，假）
                  def.resolve(true);
              });
            } else {
              console.log("无效的聊天标识");
              def.resolve(false);//高清解析（假）
            }
          });  
        return def.promise;//返回延迟的承诺;
      },
      changeChatName : function(chatId, chatName) {
        var self = this;
        if(chatId && self.isChatLoaded(chatId)) {//如果（聊天标识&&自我是加载聊天（聊天标识））
          $rootScope.chats[chatId].meta.name = chatName;//$根范围聊天[聊天ID]元名称=聊天名称
        }
      },
      isChatOwner: function(chatId) {
        var self = this;
        if(self.isNcdataInit() && self.isChatLoaded(chatId) && $rootScope.chats[chatId].meta.owner) {//如果（self.是 NC数据的init（）&& self.是加载聊天（聊天标识）&&$根Scope.chats[聊天ID].META所有者）
          return $rootScope.chats[chatId].meta.owner === self.uid;
        } else {
          return false;
        }
      },
      getChat : function(chatId) {//获得聊天:功能(聊天标识)
        var self = this;//VAR自我=这一点;
        if(self.isNcdataInit() && self.isChatLoaded(chatId)) {//如果(self.is NC数据的init()&& self.is聊天加载(聊天标识))
          return $rootScope.chats[chatId];
        }
        else 
          return false;
      },
      getChatData : function(chatId) {//
        var self = this;
        if(self.isNcdataInit() && self.isChatLoaded(chatId) ) {    //    
          return $rootScope.chats[chatId].array;
        }
        else 
          return [];
      },
      appendArray : function(chatId, type, text) {//追加数组：函数（聊天编号，类型，文本）
        var self = this;
        var def = $q.defer();//VAR高清=q延迟
        if($rootScope.chats[chatId].data.$value === null) {//如果（$根范围内的聊天记录【聊天ID]数据$值===空
          self.leaveChat(chatId);
          def.reject();
          return def.promise;
        }
        if(text) {
          var d = new Date();
          var timestamp = (0 - (d.getTime() + d.getTimezoneOffset()*60*1000));
          $analytics.eventTrack('message-send', {  category: 'message', label: type });
          return $rootScope.chats[chatId].array.$add({ 
            text: text, 
            timestamp : Firebase.ServerValue.TIMESTAMP,//时间戳：火力地堡服务价值时间STAMP
            author : self.uid,
            type : type,
            invertedTimestamp : timestamp
          });
        }
      },
      /** 社会登录 */
      getUserSettings : function(settingKey) {
        var self = this;
        if(self.isNcdataInit() && $rootScope.user.settings) {
          return $rootScope.user.settings[settingKey];
        } else {
          return false;
        }
      }, 
      setUserSettings : function(settingKey, settingValue) {//设置用户设置：功能（设置键，设置值）
        var self = this;
        if(self.isNcdataInit()) {//如果(self.is NC数据的init())
          if($rootScope.user.settings === undefined) {//如果（$ rootScope用户设置===未定义）
            $rootScope.user.settings = {};//$根范围的用户设置= {};
          }
          $rootScope.user.settings[settingKey] = settingValue;//$根范围用户设置[设置键]=设定值;
        }
      },
      getAuthState : function(loginProvider) {//得到验证状态：功能（登录提供）
        var self = this;
        var authData = self.authObj.$getAuth();//VAR AUTH数据=自我权威性的OBJ$得到验证（）。
        if(authData) {
          return authData.provider == loginProvider;//返回AUTH数据提供商==登录提供
        } else {
          return false;//返回false
        }
      },  
      logoutUser : function() {
        var self = this;
        var def = $q.defer();
        self.authObj.$unauth();//自权威性的OBJ$未自动（）; 
        self.authAnonymous(function() {//self.auth匿名
          def.resolve();
        });
        return def.promise;
      },
      authUser : function(loginProvider) {
        console.log('login');
        var self = this;
        var def = $q.defer();
        self.fbRef.authWithOAuthPopup("google", function(error, authData) {
          if (error) {
            console.log("登录失败!", error);
            def.reject();
          } else {
            console.log("有效加载成功验证:", authData);
            def.resolve();
          }
        });
        return def.promise;
      },
      uploadFile : function(file) {
        console.log(file);
        return Upload.http({
            url : 'https://api.imgur.com/3/image',
            headers : {
              'Content-Type': file.type ? file.type : 'application/octet-stream',
           Authorization : 'Client-ID 5e587b7fab642d3',
            },
            data : file
          });
      }
    };
  }
  NCService.$inject = ['$q', '$analytics', '$firebaseArray', '$firebaseObject', '$firebaseAuth', '$rootScope', '$stateParams', '$state', '$mdToast', 'Upload'];
})();
(function(){
  angular
	.module('nullchat')
	.filter('showFirstChar', function () {//过滤器（“显示第一个字符'，功能
	    return function (ownerName) {
	    	if(ownerName && ownerName.length > 1)
	        	return ownerName[0];
	       	else 
	       		return ownerName;
	    }
	})
	.filter('fromNow', function() {//过滤器（“从现在起”，函数（）
	  return function(date) {
	    return moment(date).fromNow();
	  }
	})
	.filter('nl2br', function() {//
	  return function(text) {
	    return text.replace(/&#10;/g, '<br/>');
	  };
	})
})();