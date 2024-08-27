// ==UserScript==
// @name         Filmot Title Restorer
// @namespace    http://tampermonkey.net/
// @version      0.39
// @license GPL-3.0-or-later; https://www.gnu.org/licenses/gpl-3.0.txt
// @description  Restores titles for removed or private videos in YouTube playlists
// @author       Jopik
// @match        https://*.youtube.com/*
// @icon         https://www.google.com/s2/favicons?domain=filmot.com
// @grant        none
// @require      https://cdnjs.cloudflare.com/ajax/libs/cash/8.1.5/cash.min.js
// ==/UserScript==

var darkModeBackground="#000099";
var lightModeBackground="#b0f2f4";
var darkModeLinkColor="#f1f1f1";

//console.log("Starting filmot title restorer");
document.addEventListener('yt-navigate-start', handleNavigateStart);
document.addEventListener('yt-navigate-finish', handleNavigateFinish);
document.addEventListener( 'yt-action', handlePageDataLoad );
//console.log("addEventListener completed");

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
}

function handleNavigateFinish(){
    cleanUP();
    if (window.location.href.indexOf("/playlist?")>0)
    {
        setTimeout(function(){ extractIDsFullView(); }, 500);
    }

    if (window.location.href.indexOf("/watch?")>0)
    {
        setTimeout(function(){ checkIfPrivatedOrRemoved(); }, 500);
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

function checkIfPrivatedOrRemoved() {

    if (window.ytInitialPlayerResponse.playabilityStatus.status=="ERROR") {
        var id=window.ytInitialData.currentVideoEndpoint.watchEndpoint.videoId;
        if (id.length>=11) {
            window.deletedIDs=id;
            window.deletedIDCnt=1;
            window.DetectedIDS[id]=1;
            processClick(2,0);
        }
    }
}

  function createRestoreButton() {
        var metactionbar = document.querySelector("div.metadata-action-bar");
        if (metactionbar) {
            // Create the container div
            var containerDiv = document.createElement('div');
            containerDiv.id = 'TitleRestoredDiv';
            containerDiv.style.textAlign = 'center';

            // Create the button
            var button = document.createElement('button');
            button.id = 'TitleRestoredBtn';
            button.textContent = 'Restore Titles';

            // Create the link
            var link = document.createElement('a');
            link.href = 'https://filmot.com';
            link.target = '_blank';
            link.style.color = 'white';
            link.style.fontSize = 'large';
            link.textContent = 'Powered by filmot.com';

            // Assemble the elements
            containerDiv.appendChild(button);
            containerDiv.appendChild(document.createElement('br'));
            containerDiv.appendChild(link);

            // Insert the container at the beginning of metactionbar
            metactionbar.insertBefore(containerDiv, metactionbar.firstChild);
        }
    }

function extractIDsFullView() {
    window.deletedIDs="";
    window.deletedIDCnt=0;
	var deletedIDs="";
    var deletedIDsCnt=0;

    var rendererSelector="h3.ytd-playlist-video-renderer";
	var a=$(rendererSelector).filter(function() {


        if ($(this).attr('aria-label'))
        {
            return false;
        }



        var meta=$(this).parents("#meta");
        if (meta.length==0) {
            return false;
        }
        return true;

	}).each(function( index, element ) {
		// element == this

		var ahref= $(this).children("a.yt-simple-endpoint");

        if (ahref.length>0) {
            var href=ahref.attr("href");
            var checked=ahref.attr("filmot_chk");
            var id=String(href.match(/v=[0-9A-Za-z_\-]*/gm));


            id=id.substring(2);

            if (id.length>=11 && !(checked)) {
                ahref.attr("filmot_chk","1");
                window.DetectedIDS[id]=1;
                if (deletedIDs.length>0) {
                    deletedIDs+=",";
                }
                deletedIDs+=id;
                deletedIDsCnt++;
            }
        }
    });

    if (deletedIDs.length>0) {
        window.deletedIDs=deletedIDs;
        window.deletedIDCnt=deletedIDsCnt;
        if (document.getElementById ("TitleRestoredBtn")==null)
        {
            var r;
            var metactionbar=$("div.metadata-action-bar");
            if (metactionbar.length>0)
            {
                //NEW YT FORMAT
                //r= $('<div id="TitleRestoredDiv"><center><button id="TitleRestoredBtn">Restore Titles</button><br><a style="color:white;font-size: large;" href="https://filmot.com" target="_blank">Powered by filmot.com</a></center></div>');
                //metactionbar.first().prepend(r);
                createRestoreButton();
            }

            document.getElementById ("TitleRestoredBtn").addEventListener (
                "click", ButtonClickActionFullView, false
            );
        }
        processClick(1,0);
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

function processJSONResultSingleVideo(fetched_details, format) {
    var darkMode = -1;

    for (let i = 0; i < fetched_details.length; ++i) {
        var meta = fetched_details[i];
        var escapedTitle = meta.title;
        var item = $("div.promo-message").first();

        if (darkMode == -1) {
          var lum = rgb2lum(item.css("color"));
          darkMode = (lum > 0.51) ? 1 : 0; //if text is bright it means we are in dark mode
        }

        if (!window.RecoveredIDS[meta.id]) {
            window.RecoveredIDS[meta.id] = 1;
            if (meta.channelname == null) {
                meta.channelname = fetched_details[i].channelid;
            }

            // Create "Powered by Filmot" link
            var poweredByFilmot = document.createElement('a');
            poweredByFilmot.style.fontSize = 'large';
            poweredByFilmot.className = 'yt-simple-endpoint style-scope yt-formatted-string';
            poweredByFilmot.href = 'https://filmot.com';
            poweredByFilmot.target = '_blank';
            poweredByFilmot.textContent = 'Title and Channel from filmot.com';
            item[0].appendChild(poweredByFilmot);

            // Create title link
            var titleContainer = document.createElement('h2');
            titleContainer.textContent = 'Title: ';
            var titleLink = document.createElement('a');
            titleLink.className = 'filmot_c_link yt-simple-endpoint style-scope yt-formatted-string';
            titleLink.dir = 'auto';
            titleLink.href = 'https://filmot.com/video/' + meta.id;
            titleLink.textContent = escapedTitle;
            titleLink.style.color = ((darkMode == 0) ? 'black': 'white');
            titleContainer.appendChild(titleLink);
            item[0].appendChild(titleContainer);

            // Create channel link
            var channelContainer = document.createElement('h2');
            channelContainer.textContent = 'Channel: ';
            var channelLink = document.createElement('a');
            channelLink.className = 'filmot_c_link yt-simple-endpoint style-scope yt-formatted-string';
            channelLink.dir = 'auto';
            channelLink.href = 'https://www.youtube.com/channel/' + meta.channelid;
            channelLink.textContent = meta.channelname;
            channelContainer.appendChild(channelLink);
            item[0].appendChild(channelContainer);

            // Create thumbnail image
            var newThumb = document.createElement('img');
            newThumb.id = 'filmot_newimg';
            newThumb.className = 'style-scope yt-img-shadow filmot_newimg';
            newThumb.onclick = function(event) {
                prompt('Full Title', escapedTitle);
                event.stopPropagation();
                return false;
            };
            newThumb.title = escapedTitle;
            newThumb.width = 320;
            newThumb.src = 'https://filmot.com/vi/' + meta.id + '/default.jpg';
            item[0].appendChild(newThumb);
        }
    }
}

function processJSONResultFullView(fetched_details, format) {
    var darkMode = -1;


    for (let i = 0; i < fetched_details.length; ++i) {
        var meta = fetched_details[i];
        window.RecoveredIDS[meta.id] = 1;
        var escapedTitle = meta.title;
        if (meta.channelname == null) {
            meta.channelname = fetched_details[i].channelid;
        }
        var rendererSelector = "#container.ytd-playlist-video-renderer";
        $(rendererSelector).filter(function() {
            return $(this).find("a.ytd-playlist-video-renderer[href*='" + meta.id + "']").length > 0;
        }).each(function(index, element) {


            var item = $(element);
            item.addClass("filmot_highlight");
            var titleItem = item.find("#video-title");
            titleItem.text(meta.title);
            titleItem.attr("title", meta.title);
            titleItem.attr("aria-label", meta.title);
            titleItem.addClass("filmot_title");
            if (darkMode == -1) {
                var lum = rgb2lum(titleItem.css("color"));
                darkMode = (lum > 0.51) ? 1 : 0; //if text is bright it means we are in dark mode
            }
            item.css("background-color", (darkMode == 0) ? lightModeBackground : darkModeBackground);

            var channelItem = titleItem.parent();
            channelItem.find("a.filmot_c_link").remove();

            // Create a new anchor element
            var channelLinkElement = document.createElement('a');
            channelLinkElement.className = 'filmot_c_link yt-simple-endpoint style-scope yt-formatted-string';
            channelLinkElement.dir = 'auto';
            channelLinkElement.href = 'https://www.youtube.com/channel/' + meta.channelid;
            channelLinkElement.textContent = meta.channelname;
            if (darkMode==1) {
                channelLinkElement.style.color=darkModeLinkColor;
            }


            // Append the new element
            channelItem[0].appendChild(channelLinkElement);

            item.find("#byline-container").attr("hidden", false);
            item.find(".filmot_newimg").remove();

            // Create a new image element
            var newThumbElement = document.createElement('img');
            newThumbElement.id = 'filmot_newimg';
            newThumbElement.className = 'style-scope yt-img-shadow filmot_newimg';
            newThumbElement.width = 100;
            newThumbElement.src = 'https://filmot.com/vi/' + meta.id + '/default.jpg';
            newThumbElement.title = escapedTitle;
            newThumbElement.onclick = function(event) {
                prompt('Full Title', escapedTitle);
                event.stopPropagation();
                return false;
            };

            // Append the new image
            item.find("yt-image")[0].appendChild(newThumbElement);

            item.find("img.yt-core-image").addClass("filmot_hide").hide();
        });
    }
    $("#TitleRestoredBtn").text(Object.keys(window.RecoveredIDS).length + " of " + Object.keys(window.DetectedIDS).length + " restored");
}

function processClick(format, nTry) {
    var maxTries = 5;
    var apiURL = 'https://filmot.com/api/getvideos?key=md5paNgdbaeudounjp39&id=' + window.deletedIDs;
    fetch(apiURL)
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            if (format == 1) {
                processJSONResultFullView(data, format);
            } else if (format == 2) {
                processJSONResultSingleVideo(data, format);
            }
        })
        .catch(error => {
            if (nTry >= maxTries) {
                console.error("filmot fetch error:", error);
                console.error("filmot fetch message:", error.message);
                console.error("filmot fetch stack:", error.stack);

                reportAJAXError(apiURL + " " + JSON.stringify(error));
                return;
            }
            processClick(format, nTry + 1);
        })
        .finally(() => {
            // This function will be called regardless of success or failure
        });
}
function ButtonClickActionFullView (zEvent) {
    processClick(2,0);
    return false;
}

