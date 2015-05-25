#!/usr/bin/env python2

import json
import sys

data = json.load(open(sys.argv[1], "r"))
list = data["whitelist"]

data["whitelist"] = []

for h in list:
	data["whitelist"].append(h.lower())

json.dump(data, open(sys.argv[2], "w"), indent=2)
