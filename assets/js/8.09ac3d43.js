(window.webpackJsonp=window.webpackJsonp||[]).push([[8],{403:function(e,t,r){},473:function(e,t,r){e.exports=r.p+"assets/img/complex.c6469312.jpg"},474:function(e,t,r){"use strict";var n=r(403);r.n(n).a},527:function(e,t,r){"use strict";r.r(t);r(10),r(102);var n=r(58),a=r(473),s=r.n(a),o={data:function(){return{acnl:null,drawer:null,modeler:null,ImageProjector:null}},mounted:function(){var e=this;return Object(n.a)(regeneratorRuntime.mark((function t(){var n,a,o,i,c,l,u,d,p,w,h,m,f,g;return regeneratorRuntime.wrap((function(t){for(;;)switch(t.prev=t.next){case 0:return t.next=2,Promise.all([r.e(1),r.e(2),r.e(6)]).then(r.bind(null,521));case 2:return n=t.sent,a=n.formats,o=n.Drawer,i=n.tools,c=n.Modeler,l=n.ImageProjector,(u=new a.Acnl).palette[u.palette.length-1]=u.constructor.nearestColorInColorSpace("black"),(d=new i.Pen({size:1})).paletteIndex=u.palette.length-1,p=e.$refs.drawerCanvas,(w=new o({pattern:u,canvas:p})).grid=!0,w.indicator=!0,w.source=u.sections.texture,w.tool=d,h=e.$refs.modelerCanvas,m=new c({pattern:u,canvas:h}),t.next=22,m.setup();case 22:return m.pixelFilter=!0,f=new Image,t.next=26,new Promise((function(e,t){f.addEventListener("load",(function(){e()})),f.crossOrigin="Anonymous",f.src=s.a}));case 26:return g=new l(f),t.next=29,g.project(u,0,0,f.width,f.height,u.sections.texture,0,0,u.sections.texture.width,u.sections.texture.height,0,u.palette.length,1,l.ImageSmoothingQualities.None,l.ColorMatchingMethods.LAB);case 29:e.acnl=u,e.drawer=w,e.modeler=m,e.imageProjector=g;case 33:case"end":return t.stop()}}),t)})))()},beforeDestroy:function(){var e=this;return Object(n.a)(regeneratorRuntime.mark((function t(){return regeneratorRuntime.wrap((function(t){for(;;)switch(t.prev=t.next){case 0:if(null!=e.drawer&&e.drawer.dispose(),null==e.modeler){t.next=4;break}return t.next=4,e.modeler.dispose();case 4:case"end":return t.stop()}}),t)})))()}},i=(r(474),r(44)),c=Object(i.a)(o,(function(){var e=this.$createElement,t=this._self._c||e;return t("div",{staticClass:"container"},[t("div",{staticClass:"background"}),this._v(" "),t("div",{staticClass:"foreground"},[t("canvas",{ref:"drawerCanvas",staticClass:"drawer",attrs:{width:"640",height:"640"}}),this._v(" "),t("canvas",{ref:"modelerCanvas",staticClass:"modeler",attrs:{width:"640",height:"640"}})])])}),[],!1,null,"a4e1b7be",null);t.default=c.exports}}]);