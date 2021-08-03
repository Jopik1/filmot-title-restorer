// ==UserScript==
// @name         Filmot Title Restorer
// @namespace    http://tampermonkey.net/
// @version      0.23
// @license GPL-3.0-or-later; https://www.gnu.org/licenses/gpl-3.0.txt
// @description  Restores titles for removed or private videos in YouTube playlists
// @author       Jopik
// @match        https://*.youtube.com/*
// @icon         https://www.google.com/s2/favicons?domain=filmot.com
// @grant        unsafeWindow
// @require      http://code.jquery.com/jquery-3.4.1.min.js
// ==/UserScript==

document.addEventListener('yt-navigate-start', handleNavigateStart);
document.addEventListener('yt-navigate-finish', handleNavigateFinish);
GM_addStyle("filmot_hide { display: none;} filmot_highlight {background-color: #b0f2f4;} ")

function escapeHTML(unsafe) {
  return unsafe.replace(
    /[\u0000-\u002F\u003A-\u0040\u005B-\u0060\u007B-\u00FF]/g,
    c => '&#' + ('000' + c.charCodeAt(0)).substr(-4, 4) + ';'
  )
}

function handleNavigateStart(){
    cleanUP();
}

function handleNavigateFinish(){
    cleanUP();
    extractIDs();
}

function cleanUP() {
    $("#filmot_data").remove();
    $(".filmot_hide").show();
    $(".filmot_hide").removeClass("filmot_hide");
    $(".filmot_newimg").remove();
    $(".filmot_highlight").css("background-color","");
    $(".filmot_highlight").removeClass("filmot_highlight");
    $("#TitleRestoredBtn").remove();
}

function extractIDs() {
    window.deletedIDs="";
    window.deletedIDCnt=0;
	var deletedIDs="";
    var deletedIDsCnt=0;
	var a=$("a.ytd-playlist-panel-video-renderer").filter(function() {
		return $(this).find("#video-title.ytd-playlist-panel-video-renderer[title='']").length>0;
	}).each(function( index, element ) {
		// element == this
		var href=$(element).attr('href');
		var id=String(href.match(/v=[0-9A-Za-z_\-]*/gm));
		id=id.substring(2);
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
        var r= $('<button id="TitleRestoredBtn">Restore Titles</button><center><a href="https://filmot.com" target="_blank">Powered by filmot.com</a><center>');
        $("#container.ytd-playlist-panel-renderer").first().prepend(r);
        document.getElementById ("TitleRestoredBtn").addEventListener (
                "click", ButtonClickAction, false
            );
    }
}

function processClick() {
    unsafeWindow.fetchDoneIDs=function (fetched_details) {

        for (let i = 0; i < fetched_details.length; ++i) {
            var sel="a.ytd-playlist-panel-video-renderer[href*='"+ fetched_details[i].id+"']";
            var item=$(sel);
            item.css("background-color","#b0f2f4");
            item.addClass("filmot_highlight");
            item.find("#video-title").text(fetched_details[i].title);
            item.find("#byline").text(fetched_details[i].channelname);
            item.find(".filmot_newimg").remove();
            var newThumb='<img id="filmot_newimg" class="style-scope yt-img-shadow filmot_newimg" alt="'+ escapeHTML(fetched_details[i].title)+ '" width="100" src="https://filmot.com/vi/' + fetched_details[i].id + '/default.jpg">';
            item.find("yt-img-shadow.ytd-thumbnail").append(newThumb);
            item.find("#img.yt-img-shadow").addClass("filmot_hide");
            item.find("#img.yt-img-shadow").hide();
        }
        $("#TitleRestoredBtn").text(fetched_details.length+ " of " + window.deletedIDCnt + " restored");
    };

    var data=document.createElement('script');
    data.setAttribute("id","filmot_data");
    data.src='https://filmot.com/api/getvideos?callback=window.fetchDoneIDs&js=1&key=md5paNgdbaeudounjp39&id='+ window.deletedIDs;
    document.body.appendChild(data);
}

function ButtonClickAction (zEvent) {
    processClick();
    return false;
}
