var Rhubarb = require("../build/Rhubarb.mjs");

var banner = "";
banner += "______ _           _                _     " + "\n";
banner += "| ___ \\ |         | |              | |    " + "\n";
banner += "| |_/ / |__  _   _| |__   __ _ _ __| |__  " + "\n";
banner += "|    /| '_ \\| | | | '_ \\ / _` | '__| '_ \\ " + "\n";
banner += "| |\\ \\| | | | |_| | |_) | (_| | |  | |_) |" + "\n";
banner += "\\_| \\_|_| |_|\\__,_|_.__/ \\__,_|_|  |_.__/ " + "\n";
banner += "                                          " + "\n";
banner += "                           by Oguz Eroglu " + "\n";
banner += "                                          " + "\n";

console.log(banner);

Rhubarb.init('./dev/example-protocol-definition.json');
