/*====================================
    電子スターフ
====================================*/

//==============================
// グローバル変数
//==============================

let stopList = [];
let currentIndex = 0;
let gpsWatchID = null;

let popupShown = [];


//==============================
// HTML取得
//==============================

const startup = document.getElementById("startup");
const mainScreen = document.getElementById("mainScreen");

const diagramInput = document.getElementById("diagramInput");
const startButton = document.getElementById("startButton");

const currentDate = document.getElementById("currentDate");
const currentTime = document.getElementById("currentTime");

const diagramName = document.getElementById("diagramName");
const routeName = document.getElementById("routeName");

const loading = document.getElementById("loading");
const errorBox = document.getElementById("errorBox");


//==============================
// 時計表示
//==============================

function updateClock(){

    const now = new Date();

    const yyyy = now.getFullYear();

    const mm = String(now.getMonth()+1).padStart(2,"0");

    const dd = String(now.getDate()).padStart(2,"0");

    const hh = String(now.getHours()).padStart(2,"0");

    const mi = String(now.getMinutes()).padStart(2,"0");

    const ss = String(now.getSeconds()).padStart(2,"0");

    currentDate.textContent =
        `${yyyy}/${mm}/${dd}`;

    currentTime.textContent =
        `${hh}:${mi}:${ss}`;

}

setInterval(updateClock,1000);

updateClock();


//==============================
// エラー表示
//==============================

function showError(message){

    errorBox.textContent = message;

    errorBox.classList.remove("hidden");

    setTimeout(()=>{

        errorBox.classList.add("hidden");

    },3000);

}


//==============================
// 運行開始
//==============================

startButton.addEventListener("click",startApp);


// Enterキーでも開始

diagramInput.addEventListener("keydown",(e)=>{

    if(e.key==="Enter"){

        startApp();

    }

});


//==============================
// 起動
//==============================

async function startApp(){

    const diagram = diagramInput.value.trim();

    if(diagram===""){

        showError("ダイヤ名を入力してください");

        return;

    }

    // 漢字1～2文字＋数字3～4桁

    const regex = /^[^\x00-\x7F]{1,2}[0-9]{3,4}$/;

    if(!regex.test(diagram)){

        showError("ダイヤ名形式が違います");

        return;

    }

    diagramName.textContent = diagram;

    loading.classList.remove("hidden");

    try{
         console.log(diagram);
        await loadCSV(diagram);

        startup.classList.add("hidden");

        mainScreen.classList.remove("hidden");

        loading.classList.add("hidden");

        updateStopDisplay();

        // GPS開始（Part2）

        startGPS();

    }

    catch(e){

        loading.classList.add("hidden");

        showError("CSVが見つかりません");

        console.error(e);

    }

}


//==============================
// CSV読込
//==============================

async function loadCSV(diagram){

    const file = `csv/${diagram}.csv`;

    const response = await fetch(file);

    if(!response.ok){

        throw new Error("CSVなし");

    }

    const text = await response.text();

    parseCSV(text);

}


//==============================
// CSV解析
//==============================

function parseCSV(text){

    stopList=[];

    popupShown=[];

    const rows = text.trim().split("\n");

    // 1行目
    const header = rows[0].split(",");
    routeName.textContent = header[1];

    // 3行目から停留所
    for(let i=2;i<rows.length;i++){

        const col = rows[i].split(",");

        stopList.push({

            no:Number(col[0]),

            name:col[1],

            time:col[2],

            lat:Number(col[3]),

            lng:Number(col[4]),

            popup:col[5],

            popupDistance:Number(col[6])

        });

    }

}


//==============================
// 停留所表示
//==============================

function updateStopDisplay(){

    for(let i=0;i<3;i++){

        const stop = stopList[currentIndex+i];
        console.log(currentIndex);
        const name =
            document.getElementById(`stop${i+1}Name`);

        const time =
            document.getElementById(`stop${i+1}Time`);
        

        if(stop){

            name.textContent = stop.name;

            time.textContent = String(stop.time).substr(0,5);

        }

        else{

            name.textContent = "";

            time.textContent = "";

        }

    }

}
/*====================================
    Part2 GPS・停留所判定
====================================*/

// GPS精度表示
const gpsAccuracy = document.getElementById("gpsAccuracy");

const popup = document.getElementById("popup");
const popupMessage = document.getElementById("popupMessage");


//==================================
// GPS開始
//==================================

function startGPS(){

    if(!navigator.geolocation){

        showError("GPSが利用できません");

        return;

    }

    gpsWatchID = navigator.geolocation.watchPosition(

        onGPS,

        onGPSError,

        {

            enableHighAccuracy:true,

            maximumAge:0,

            timeout:10000

        }

    );

}




//==================================
// GPS受信
//==================================

let initialized = false;

function onGPS(position){
    console.log("GPS計測");

    const lat = position.coords.latitude;
    const lng = position.coords.longitude;
    const accuracy = position.coords.accuracy;

    gpsAccuracy.textContent =
        Math.round(accuracy) + " m";

    if(!initialized){

        findNearestStop(lat,lng);

        initialized = true;

    }

    judgeStop(lat,lng);

    judgePopup(lat,lng);

}



//==================================
// GPSエラー
//==================================

function onGPSError(error){

    console.log(error);

    showError("GPS取得失敗");

}



//==================================
// 停留所判定
//==================================

let previousDistance = Infinity;

function judgeStop(lat,lng){

    if(currentIndex>=stopList.length) return;

    const stop=stopList[currentIndex];

    const d=distance(
        lat,
        lng,
        stop.lat,
        stop.lng
    );
    console.log(d);
    if(previousDistance<=20 && d>20){

        currentIndex++;

        updateStopDisplay();

    }

    previousDistance=d;

}



//==================================
// ポップアップ判定
//==================================

function judgePopup(lat,lng){

    stopList.forEach((stop,index)=>{

        if(popupShown[index]){

            return;

        }

        if(stop.popup==""){

            return;

        }

        const d = distance(

            lat,
            lng,

            stop.lat,
            stop.lng

        );

        if(d<=stop.popupDistance){

            popupShown[index]=true;

            showPopup(stop.popup);

        }

    });

}



//==================================
// ポップアップ
//==================================

function showPopup(message){

    popupMessage.textContent=message;

    popup.classList.remove("hidden");

    setTimeout(()=>{

        popup.classList.add("hidden");

    },5000);

}



//==================================
// 距離計算
//==================================

function distance(lat1,lon1,lat2,lon2){

    const R=6371000;

    const rad=Math.PI/180;

    const dLat=(lat2-lat1)*rad;

    const dLon=(lon2-lon1)*rad;

    const a=

        Math.sin(dLat/2)**2+

        Math.cos(lat1*rad)

        *

        Math.cos(lat2*rad)

        *

        Math.sin(dLon/2)**2;

    const c=2*Math.atan2(

        Math.sqrt(a),

        Math.sqrt(1-a)

    );

    return R*c;

}



//==================================
// 終点
//==================================

function finishRun(){

    if(gpsWatchID!=null){

        navigator.geolocation.clearWatch(gpsWatchID);

    }

    document.getElementById("stop1Name").textContent="終点";

    document.getElementById("stop1Time").textContent="";

    document.getElementById("stop2Name").textContent="";

    document.getElementById("stop2Time").textContent="";

    document.getElementById("stop3Name").textContent="";

    document.getElementById("stop3Time").textContent="";

    showPopup("運行終了");

}

function findNearestStop(lat, lng){

    let minDistance = Infinity;
    let nearestIndex = 0;

    stopList.forEach((stop, index)=>{

        const d = distance(
            lat,
            lng,
            stop.lat,
            stop.lng
        );

        if(d < minDistance){
            
            minDistance = d;
            nearestIndex = index;

        }

    });

    currentIndex = nearestIndex;

    updateStopDisplay();

}

/*====================================
    Part3 初期化・安全対策
====================================*/

// GPS飛び防止用
let lastUpdateTime = 0;

// 連続通過防止
let lastPassedStop = -1;

//==================================
// CSVチェック
//==================================

function validateCSV(){

    if(stopList.length===0){

        showError("CSVに停留所データがありません");

        return false;

    }

    for(const stop of stopList){

        if(isNaN(stop.lat) || isNaN(stop.lng)){

            showError("緯度経度が不正です");

            return false;

        }

    }

    return true;

}


//==================================
// GPS処理を上書き
//==================================

const originalOnGPS = onGPS;

onGPS = function(position){

    // 0.5秒以内は無視
    const now = Date.now();

    if(now-lastUpdateTime<500){

        return;

    }

    lastUpdateTime=now;

    originalOnGPS(position);

};


//==================================
// 停留所判定を上書き
//==================================

const originalJudgeStop = judgeStop;

judgeStop = function(lat,lng){

    if(currentIndex===lastPassedStop){

        return;

    }

    originalJudgeStop(lat,lng);

    lastPassedStop=currentIndex;

};


//==================================
// リセット
//==================================

function resetRun(){

    if(gpsWatchID!=null){

        navigator.geolocation.clearWatch(gpsWatchID);

    }

    currentIndex=0;

    stopList=[];

    popupShown=[];

    gpsWatchID=null;

    lastPassedStop=-1;

    startup.classList.remove("hidden");

    mainScreen.classList.add("hidden");

    loading.classList.add("hidden");

    popup.classList.add("hidden");

    diagramInput.value="";

}


//==================================
// CSVロード後チェック
//==================================

const originalLoadCSV = loadCSV;

loadCSV = async function(diagram){

    await originalLoadCSV(diagram);

    if(!validateCSV()){

        throw new Error();

    }

};


//==================================
// ページ離脱
//==================================

window.addEventListener("beforeunload",()=>{

    if(gpsWatchID!=null){

        navigator.geolocation.clearWatch(gpsWatchID);

    }

});


//==================================
// ESCキーでリセット
//==================================

document.addEventListener("keydown",(e)=>{

    if(e.key==="Escape"){

        if(confirm("運行を終了しますか？")){

            resetRun();

        }

    }

});


//==================================
// 初期化
//==================================

loading.classList.add("hidden");

popup.classList.add("hidden");

errorBox.classList.add("hidden");

console.log("電子スターフ起動完了");
