// ==UserScript==
// @name         Filmot Title Restorer
// @namespace    http://tampermonkey.net/
// @version      0.1
// @license GPL-3.0-or-later; https://www.gnu.org/licenses/gpl-3.0.txt
// @description  Restores titles for removed or private videos in YouTube playlists
// @author       Jopik
// @match        https://*.youtube.com/watch*
// @icon         https://www.google.com/s2/favicons?domain=filmot.com
// @grant        unsafeWindow
// @require      http://code.jquery.com/jquery-3.4.1.min.js
// ==/UserScript==


$(document).ready(function() { //When document has loaded
    setTimeout(function() {
        extractIDs();
    }, 3000);
});

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
        var r= $('<button id="TitleRestoredBtn">Restore Titles</button>');
        $("#secondary.ytd-watch-flexy").first().prepend(r);

        //--- Activate the newly added button.
        document.getElementById ("TitleRestoredBtn").addEventListener (
            "click", ButtonClickAction, false
        );


    }
}

function processClick() {
    unsafeWindow.fetchDoneIDs=function (fetched_details) {

        for (let i = 0; i < fetched_details.length; ++i) {
            var sel="a.ytd-playlist-panel-video-renderer[href*='"+ fetched_details[i].id+"']";
            $(sel).css("background-color","#6ab8f7");
            $(sel).find("#video-title").text(fetched_details[i].title);
            $(sel).find("#byline").text(fetched_details[i].channelname);
            var newThumb='<img id="newimg" class="style-scope yt-img-shadow" alt="" width="100" src="https://filmot.com/vi/' + fetched_details[i].id + '/default.jpg">';
            $(sel).find("#newimg").remove();
            $(sel).find(".ytd-thumbnail").append(newThumb);
            $(sel).find("#img.yt-img-shadow").hide();
            //attr('src', 'https://filmot.com/vi/' + fetched_details[i].id + '/default.jpg');
        }
        $("#TitleRestoredBtn").text(fetched_details.length+ " of " + window.deletedIDCnt + " restored");
    };

    document.body.appendChild(document.createElement('script')).src='https://filmot.com/api/getvideos?callback=window.fetchDoneIDs&js=1&key=md5paNgdbaeudounjp39&id='+ window.deletedIDs;
}

function ButtonClickAction (zEvent) {
    processClick();
    return false;
}
