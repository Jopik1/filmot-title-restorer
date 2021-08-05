// ==UserScript==
// @name         Filmot Title Restorer
// @namespace    http://tampermonkey.net/
// @version      0.33
// @license GPL-3.0-or-later; https://www.gnu.org/licenses/gpl-3.0.txt
// @description  Restores titles for removed or private videos in YouTube playlists
// @author       Jopik
// @match        https://*.youtube.com/*
// @icon         https://www.google.com/s2/favicons?domain=filmot.com
// @grant        none
// @require      http://code.jquery.com/jquery-3.4.1.min.js
// ==/UserScript==

var darkModeBackground="#000099";
var lightModeBackground="#b0f2f4";

document.addEventListener('yt-navigate-start', handleNavigateStart);
document.addEventListener('yt-navigate-finish', handleNavigateFinish);
document.addEventListener( 'yt-action', handlePageDataLoad );

GM_addStyle("filmot_hide { display: none;} filmot_highlight {background-color: #b0f2f4;} ");

//fire at least once on load, sometimes handleNavigateFinish on first load yt-navigate-finish already fired before script loads
handleNavigateFinish();



function escapeHTML(unsafe) {
  return unsafe.replace(
    /[\u0000-\u002F\u003A-\u0040\u005B-\u0060\u007B-\u00FF]/g,
    c => '&#' + ('000' + c.charCodeAt(0)).substr(-4, 4) + ';'
  )
}

function handlePageDataLoad(event){
    if (event.detail!=null && event.detail.actionName!=null && event.detail.actionName.indexOf("yt-append-continuation")>=0) {
        console.log("filmot yt-append-continuation");
        console.log(event);
        if (window.location.href.indexOf("/playlist?")>0)
        {
            extractIDsFullView();
        }
    }
}

function handleNavigateStart(){
    var filmotTitles=$(".filmot_title");
    filmotTitles.text("");
    filmotTitles.removeClass("filmot_title");
    var filmotChannels=$(".filmot_channel");
    filmotChannels.text("");
    filmotChannels.attr("onclick","");
    filmotChannels.removeClass("filmot_channel");
    cleanUP();
    console.log("filmot handleNavigateStart");
}

function handleNavigateFinish(){
    cleanUP();
    console.log("filmot handleNavigateFinish");
    if (window.location.href.indexOf("/playlist?")>0)
    {
        setTimeout(function(){ extractIDsFullView(); }, 500);
    }
    else
    {
        setTimeout(function(){ extractIDsSideView(); }, 500);
    }
}

function cleanUP() {
    $(".filmot_hide").show();
    $(".filmot_hide").removeClass("filmot_hide");
    $(".filmot_newimg").remove();
    $(".filmot_highlight").css("background-color","");
    $(".filmot_highlight").removeClass("filmot_highlight");
    $("#TitleRestoredDiv").remove();
    $(".filmot_c_link").remove();
    window.RecoveredIDS={};
    window.DetectedIDS={};
}

function extractIDsFullView() {
    window.deletedIDs="";
    window.deletedIDCnt=0;
	var deletedIDs="";
    var deletedIDsCnt=0;
    
    var rendererSelector="a.ytd-playlist-video-renderer";
	var a=$(rendererSelector).filter(function() {
        return !$(this).attr('aria-label');
	}).each(function( index, element ) {
		// element == this
		var href=$(element).attr('href');
		var id=String(href.match(/v=[0-9A-Za-z_\-]*/gm));
		id=id.substring(2);
        window.DetectedIDS[id]=1;
		if (deletedIDs.length>0)
        {
            deletedIDs+=",";
        }
		deletedIDs+=id;
        deletedIDsCnt++;
	});

    if (deletedIDs.length>0) {
        window.deletedIDs=deletedIDs;
        window.deletedIDCnt=deletedIDsCnt;
        if (document.getElementById ("TitleRestoredBtn")==null)
        {
            var r= $('<div id="TitleRestoredDiv"><center><button id="TitleRestoredBtn">Restore Titles</button><br><a class="yt-simple-endpoint style-scope yt-formatted-string" href="https://filmot.com" target="_blank">Powered by filmot.com</a></center></div>');
            $("#items.ytd-playlist-sidebar-renderer").first().prepend(r);
            document.getElementById ("TitleRestoredBtn").addEventListener (
                "click", ButtonClickActionFullView, false
            );
        }
        processClick(2);
    }
    
}


function extractIDsSideView() {
    window.deletedIDs="";
    window.deletedIDCnt=0;
	var deletedIDs="";
    var deletedIDsCnt=0;
   
    var rendererSelector="a.ytd-playlist-panel-video-renderer";
	var a=$(rendererSelector).filter(function() {
		return $(this).find("#video-title.ytd-playlist-panel-video-renderer[title='']").length>0;
	}).each(function( index, element ) {
		// element == this
		var href=$(element).attr('href');
		var id=String(href.match(/v=[0-9A-Za-z_\-]*/gm));
		id=id.substring(2);
        window.DetectedIDS[id]=1;
		if (deletedIDs.length>0)
        {
            deletedIDs+=",";
        }
		deletedIDs+=id;
        deletedIDsCnt++;
	});

    if (deletedIDs.length>0) {
        window.deletedIDs=deletedIDs;
        window.deletedIDCnt=deletedIDsCnt;
        if (document.getElementById ("TitleRestoredBtn")==null)
        {
            var r= $('<div id="TitleRestoredDiv"><center><button id="TitleRestoredBtn">Restore Titles</button><br><a class="yt-simple-endpoint style-scope yt-formatted-string" href="https://filmot.com" target="_blank">Powered by filmot.com</a></center></div>');
            $("#container.ytd-playlist-panel-renderer").first().prepend(r);
            document.getElementById ("TitleRestoredBtn").addEventListener (
                "click", ButtonClickActionSideView, false
            );
        }
    }
}

function reportAJAXError(error)
{
    alert("Error fetching API results " + error);
}

function rgb2lum(rgb)
{
    // calculate relative luminance of a color provided by rgb() string
    // black is 0, white is 1
    rgb = rgb.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);

    if (rgb.length==4) {
        var R=parseInt(rgb[1],10)/255.0;
        var G=parseInt(rgb[2],10)/255.0;
        var B=parseInt(rgb[3],10)/255.0;
        return 0.2126*R + 0.7152*G + 0.0722*B;
    }
    return 1;
}

function processJSONResultSideView (fetched_details,format)
{
    var darkMode=-1;

    for (let i = 0; i < fetched_details.length; ++i) {
        var meta=fetched_details[i];
        window.RecoveredIDS[meta.id]=1;
        var escapedTitle=escapeHTML(meta.title);
        if (meta.channelname==null) {
            meta.channelname=fetched_details[i].channelid;
        }


        var sel="a.ytd-playlist-panel-video-renderer[href*='"+ meta.id+"']";
        var item=$(sel);

        //console.log(item);

        item.addClass("filmot_highlight");

        var titleItem=item.find("#video-title");
        titleItem.text(meta.title);
        titleItem.attr("title",meta.title);
        titleItem.attr("aria-label",meta.title);
        titleItem.addClass("filmot_title");


        if (darkMode==-1)
        {
            var lum=rgb2lum(titleItem.css("color"));
            darkMode = (lum>0.51)?1:0; //if text is bright it means we are in dark mode
        }

        item.css("background-color",(darkMode==0)?lightModeBackground:darkModeBackground);

        var channelItem=item.find("#byline");

        channelItem.text(fetched_details[i].channelname);
        channelItem.attr("onclick","window.open('https://www.youtube.com/channel/" +fetched_details[i].channelid + "', '_blank'); event.stopPropagation(); return false;");
        channelItem.addClass("filmot_channel");

        item.find(".filmot_newimg").remove();
        var newThumb='<img id="filmot_newimg" class="style-scope yt-img-shadow filmot_newimg" onclick="prompt(\'Full Title\', \''+ escapedTitle+ '\'); event.stopPropagation(); return false;" title="' + escapedTitle + '" width="100" src="https://filmot.com/vi/' + meta.id + '/default.jpg">';
        item.find("yt-img-shadow.ytd-thumbnail").append(newThumb);
        item.find("#img.yt-img-shadow").addClass("filmot_hide");
        item.find("#img.yt-img-shadow").hide();
    }

    $("#TitleRestoredBtn").text(Object.keys(window.RecoveredIDS).length+ " of " +Object.keys(window.DetectedIDS).length + " restored");
}


function processJSONResultFullView (fetched_details,format)
{
    var darkMode=-1;

    for (let i = 0; i < fetched_details.length; ++i) {
        var meta=fetched_details[i];
        window.RecoveredIDS[meta.id]=1;
        var escapedTitle=escapeHTML(meta.title);

        if (meta.channelname==null) {
            meta.channelname=fetched_details[i].channelid;
        }

        var rendererSelector="#container.ytd-playlist-video-renderer";
        var a=$(rendererSelector).filter(function() {
            return $(this).find("a.ytd-playlist-video-renderer[href*='"+ meta.id+"']").length>0;
        }).each(function( index, element ) {
            // element == this
            var item=$(element);

            item.addClass("filmot_highlight");

            var titleItem=item.find("#video-title");
            titleItem.text(meta.title);
            titleItem.attr("title",meta.title);
            titleItem.attr("aria-label",meta.title);
            titleItem.addClass("filmot_title");

            if (darkMode==-1)
            {
              var lum=rgb2lum(titleItem.css("color"));
              darkMode = (lum>0.51)?1:0; //if text is bright it means we are in dark mode
            }

            item.css("background-color",(darkMode==0)?lightModeBackground:darkModeBackground);

            var channelItem=item.find("yt-formatted-string.ytd-channel-name");
            //console.log(channelItem);
            channelItem.find("a.filmot_c_link").remove();
            var channelLink="<a class='filmot_c_link yt-simple-endpoint style-scope yt-formatted-string' dir='auto' href='https://www.youtube.com/channel/" +meta.channelid + "'>" + escapeHTML(meta.channelname) + "</a>";
            channelItem.append(channelLink);

            item.find("#byline-container").attr("hidden",false);
            item.find(".filmot_newimg").remove();
            var newThumb='<img id="filmot_newimg" class="style-scope yt-img-shadow filmot_newimg" onclick="prompt(\'Full Title\', \''+ escapedTitle+ '\'); event.stopPropagation(); return false;" title="' + escapedTitle + '" width="100" src="https://filmot.com/vi/' + meta.id + '/default.jpg">';
            item.find("yt-img-shadow.ytd-thumbnail").append(newThumb);
            item.find("#img.yt-img-shadow").addClass("filmot_hide");
            item.find("#img.yt-img-shadow").hide();

        });

    }

    $("#TitleRestoredBtn").text(Object.keys(window.RecoveredIDS).length+ " of " + Object.keys(window.DetectedIDS).length + " restored");
}

function processClick(format)
{
    var apiURL='https://filmot.com/api/getvideos?key=md5paNgdbaeudounjp39&id='+ window.deletedIDs;
    var jqxhr = $.getJSON(apiURL, function(data) {
        if (format==1) {
            processJSONResultSideView(data,format);
        }
        else
        {
            processJSONResultFullView(data,format);
        }
    })
    .done(function(data) {
    })
    .fail(function(error) {
        reportAJAXError(apiURL + " " + JSON.stringify(error));
    })
    .always(function() {
    });

}

function ButtonClickActionSideView (zEvent) {
    processClick(1);
    return false;
}

function ButtonClickActionFullView (zEvent) {
    processClick(2);
    return false;
}

