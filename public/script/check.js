let divData = JSON.parse($("#divData").text());

const divYield = divData["divYield"];
const divGrowth = divData["divGrowth"];
const divPayoutRatio = divData["divPayoutRatio"];
const returnOnEquity = divData["returnOnEquity"];

$("#divYield").removeClass("alert-secondary");
$("#divGrowth").removeClass("alert-secondary");
$("#divPayout").removeClass("alert-secondary");
$("#divROE").removeClass("alert-secondary");

if (divYield >= 0.04) {
  $("#divYield").addClass("alert-success");
} else {
  $("#divYield").addClass("alert-danger");
}

if (divGrowth >= 0.05) {
  $("#divGrowth").addClass("alert-success");
} else {
  $("#divGrowth").addClass("alert-danger");
}

if (divPayoutRatio >= 0.3 && divPayoutRatio <= 0.6) {
  $("#divPayout").addClass("alert-success");
} else {
  $("#divPayout").addClass("alert-danger");
}

if (returnOnEquity >= 0.15) {
  $("#divROE").addClass("alert-success");
} else {
  $("#divROE").addClass("alert-danger");
}
