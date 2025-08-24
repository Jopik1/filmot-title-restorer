# filmot-title-restorer
Tampermonkey user script that restores titles for removed or private videos in YouTube playlists


Changelog:

    24 August 2025
    Merged Vankata453 enhancement - Adds buttons to view video metadata on Filmot (in playlist view) and check/view earliest Wayback archive (in playlist and single video view)
    
    2 August 2025
    Merged Vankata453 fix - Do not show Filmot video metadata when requiring login for age-gated videos
    
    6 June 2025
    Merged Samg381 fixes for restore button placement on regular playlists and watch later playlists
    
    18 February 2025
    Merged Samg381 fix for "restore button not appearing on Firefox"
    
    27 October 2024
    Fixed to work with YT layout changes.
    Fixed placement of information for single video pages where sign in was requested for private videos or where the channel was still alive.
 
    27 August 2024
    Fixed to work with Chrome v3 manifest update and YT layout changes
    Replaced jquery with cash.min.js to avoid Chrome TrustedHTML errors
    Fixed element placement for YT layout changes
    Replaced injection of raw HTML with v3 supported operations


    29 September 2023
    Cleanup.
    Fixed bug with continuation not working after YT format change.
    Added support for displaying video metadata on single deleted video page (i.e. /watch endpoint).


    29 October 2022
    Fixed to work with new YouTube layout. Should work with both new layout and the old layout.
    
    08 April 2022
    Due to a YouTube format change version 0.34 did not work properly and erroneously detected working videos as deleted.
    Fixed by detecting the channel name which is missing on deleted videos in the current format.
    Please update to the current version - version 0.35.



    Added support for dark mode (highlight and link color adjust appropriately when script executes)
    
    Added support for full format playlists, For example: https://www.youtube.com/playlist?list=PLgAG0Ep5Hk9IJf24jeDYoYOfJyDFQFkwq
    Click on the ... button in the playlist menu and select "Show unavailable videos". Also works as you scroll the page.
    
    Clicking on restored thumbnail displays the full title in a prompt text box (can be copied)
    Clicking on channel name will open the channel in a new tab
    Optimized jQuery selector access
    Fixed case where script was loaded after yt-navigate-finish already fired and button wasn't loading
    Added full title as a tooltip/title
    Switch to fetching data using AJAX instead of injecting a JSONP script (more secure)
    

