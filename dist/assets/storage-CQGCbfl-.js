const e="leetfriends_data";async function a(){try{return await chrome.storage.local.remove(e),!0}catch(r){return console.error("Error clearing data:",r),!1}}export{a as clearAllData};
