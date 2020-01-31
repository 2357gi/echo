# -*- coding: utf-8 -*-
"""
Copyright (c) 2017 Hao Peng
Released under the MIT license
https://github.com/haoopeng/echo/blob/master/LICENSE
"""

import codecs
import csv
import json
import sys
reload(sys)
sys.setdefaultencoding('utf8')

textSet = {}

with codecs.open("language.csv", encoding="utf-8") as csvfile:
    csvreader = csv.reader(csvfile, delimiter=',', quotechar='"')

    header = next(csvreader)
    for i in range(1, len(header)):
        textSet[header[i]] = {}

    for row in csvreader:
        key = row[0]
        for i in range(1, len(header)):
            textSet[header[i]][key] = row[i]

with codecs.open("../js/languageset.js", "w", encoding="utf-8") as jsfile:
    jsfile.write("var textSet = ")
    json.dump(textSet, jsfile, ensure_ascii=False, indent=4, separators=(',', ': '))
