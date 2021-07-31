// ==UserScript==
// @name         Filmot Title Restorer
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  Restores titles for removed or private videos in YouTube playlists
// @author       Jopik
// @match        https://*.youtube.com/watch*
// @icon         https://www.google.com/s2/favicons?domain=filmot.com
// @grant        none
// @require      http://code.jquery.com/jquery-3.4.1.min.js
// @license      GPLv3
// ==/UserScript==


/*--- Create a button in a container div.  It will be styled and
    positioned with CSS.
*/
var r= $('<button id="TitleRestoredBtn">Restore Titles</button>');
$("#secondary.ytd-watch-flexy").first().prepend(r);

//--- Activate the newly added button.
document.getElementById ("TitleRestoredBtn").addEventListener (
    "click", ButtonClickAction, false
);



function extractIDs() {
	var deleted_ids="";
	var a=$("a.ytd-playlist-panel-video-renderer").filter(function() {
		return $(this).find("#video-title.ytd-playlist-panel-video-renderer[title='']").length>0;
	}).each(function( index, element ) {
		// element == this
		var href=$(element).attr('href');
		var id=String(href.match(/v=[0-9A-Za-z_\-]*/gm));
		id=id.substring(2);
		if (deleted_ids.length>0)
        {
            deleted_ids+=",";
        }
		deleted_ids+=id;
	});


    var code=`function fetchDoneIDs() {
        for (let i = 0; i < window.fetched_details.length; ++i) {
            sel="a.ytd-playlist-panel-video-renderer[href*='"+ window.fetched_details[i].id+"']";
            $(sel).css("background-color","#6ab8f7");
            $(sel).find("#video-title").text(window.fetched_details[i].title);
            $(sel).find("#byline").text(window.fetched_details[i].channelname);
        }
    }`;

    var JS= document.createElement('script');
    JS.text= code;
    document.body.appendChild(JS);

    document.body.appendChild(document.createElement('script')).src='https://filmot.com/api/getvideos?callback=fetchDoneIDs&js=1&key=md5paNgdbaeudounjp39&id='+ deleted_ids;

}

function ButtonClickAction (zEvent) {
    extractIDs();
    return false;
}
