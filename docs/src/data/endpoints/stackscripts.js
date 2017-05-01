module.exports = {"name":"StackScripts","sort":4,"base_path":"/linode/stackscripts","description":"StackScript endpoints provide a means of managing the <a href=\"#object-stackscript\"> StackScript objects</a> accessible from your account.\n","endpoints":[{"type":"list","resource":"stackscript","description":"View public StackScripts.\n","methods":[{"description":"Returns a list of public <a href=\"#object-stackscript\">StackScripts</a>. Results can be <a href=\"#filtering\">filtered</a>.  Include '\"mine\": true' in the filter dict to see only StackScripts you created.\n","examples":[{"name":"curl","value":"curl https://$api_root/$version/linode/stackscripts\n"},{"name":"python","value":"import stackscript\nTODO\n"}],"name":"GET","resource":{"name":"StackScript","prefix":"stck","description":"StackScript objects describe a StackScript which can be used to help automate deployment of new Linodes.\n","schema":[{"name":"id","description":"A unique ID for the StackScript.","type":"integer","value":37},{"name":"customer_id","description":"The customer that created this StackScript.","type":"integer","value":123},{"name":"user_id","description":"The user account that created this StackScript.","type":"integer","value":456},{"name":"label","description":"This StackScript's display label.","editable":true,"type":"string","value":"Example StackScript"},{"name":"description","description":"In-depth information on what this StackScript does.","editable":true,"type":"string","value":"Installs the Linode API bindings"},{"name":"distributions","description":"A list of distributions this StackScript is compatible with.","editable":true,"type":"array","value":[{"id":{"_type":"string","_value":"linode/debian8"},"label":{"_type":"string","_value":"Debian 8.1"},"vendor":{"_type":"string","_value":"Debian"},"x64":{"_type":"boolean","_value":true},"recommended":{"_type":"boolean","_value":true},"created":{"_type":"datetime","_value":"2015-04-27T16:26:41.000Z"},"minimum_storage_size":{"_type":"integer","_value":900}},{"id":{"_type":"string","_value":"linode/debian7"},"label":{"_type":"string","_value":"Debian 7"},"vendor":{"_type":"string","_value":"Debian"},"x64":{"_type":"boolean","_value":true},"recommended":{"_type":"boolean","_value":true},"created":{"_type":"datetime","_value":"2014-09-24T13:59:32.000Z"},"minimum_storage_size":{"_type":"integer","_value":600}}]},{"name":"deployments_total","description":"The total number of times this StackScript has been deployed.","type":"integer","value":150},{"name":"deployments_active","description":"The total number of active deployments.","type":"integer","value":42},{"name":"is_public","description":"Publicize StackScript in the Linode StackScript library. Note that StackScripts cannot be changed to private after they have been public.\n","editable":true,"type":"boolean","value":true},{"name":"created","description":"When the StackScript was initially created.","type":"datetime","value":"2015-09-29T11:21:01"},{"name":"updated","description":"When the StackScript was last updated.","type":"datetime","value":"2015-10-15T10:02:01"},{"name":"rev_note","description":"The most recent note about what was changed for this revision.","editable":true,"type":"string","value":"Initial import"},{"name":"script","description":"The actual script body to be executed.","editable":true,"type":"string","value":"#!/bin/bash"},{"name":"user_defined_fields","description":"Variables that can be set to customize the script per deployment.","type":"array","value":[{"name":{"_type":"string","_value":"var1"},"label":{"_type":"string","_value":"A question"},"example":{"_type":"string","_value":"An example value"},"default":{"_type":"string","_value":"Default value"}},{"name":{"_type":"string","_value":"var2"},"label":{"_type":"string","_value":"Another question"},"example":{"_type":"string","_value":"possible"},"oneof":{"_type":"string","_value":"possible,enum,values"}}]}],"endpoints":null,"methods":null}},{"oauth":"stackscripts:create","description":"Create a new StackScript.\n","params":[{"description":"Label of StackScript.\n","limit":"3-128 characters","name":"label"},{"optional":true,"description":"Description of the StackScript.\n","name":"description"},{"description":"A list of <a href=\"#object-distribution\">distributions</a> compatible with StackScript.\n","type":"distribution","name":"distributions"},{"optional":true,"description":"If true, this StackScript will be publicly visible in the Linode StackScript library. Defaults to False.\n","name":"is_public"},{"optional":true,"description":"Release notes for this revision.\n","limit":"0-512 characters","name":"rev_note"},{"description":"The shell script to run on boot.\n","name":"script"}],"examples":[{"name":"curl","value":"curl -H \"Content-Type: application/json\" \\\n  -H \"Authorization: token $TOKEN\" \\\n  -X POST -d '{\n    \"label\": \"Initial Label\",\n    \"distributions\": [\"linode/ubuntu15.4\", \"linode/ubuntu15.10\"],\n    \"script\": \"#!...\"\n  }' \\\n  https://$api_root/$version/linode/stackscripts\n"},{"name":"python","value":"import stackscript\nTODO\n"}],"name":"POST"}],"endpoints":null,"path":"linode/stackscripts"},{"type":"list","resource":"stackscript","authenticated":true,"description":"Manage a particular StackScript.\n","methods":[{"oauth":"stackscripts:view","description":"Returns information about this <a href=\"#object-stackscript\"> StackScript</a>.\n","examples":[{"name":"curl","value":"curl -H \"Content-Type: application/json\" \\\n  -H \"Authorization: token $TOKEN\" \\\n  -X GET \\\n  https://$api_root/$version/linode/stackscripts/$stackscript_id\n"},{"name":"python","value":"import stackscript\nTODO\n"}],"name":"GET","resource":{"name":"StackScript","prefix":"stck","description":"StackScript objects describe a StackScript which can be used to help automate deployment of new Linodes.\n","schema":[{"name":"0"},{"name":"1"},{"name":"2"},{"name":"3"},{"name":"4"},{"name":"5"},{"name":"6"},{"name":"7"},{"name":"8"},{"name":"9"},{"name":"10"},{"name":"11"},{"name":"12"},{"name":"13"}],"endpoints":null,"methods":null}},{"oauth":"stackscripts:modify","description":"Edits this StackScript.\n","examples":[{"name":"curl","value":"curl -H \"Content-Type: application/json\" \\\n  -H \"Authorization: token $TOKEN\" \\\n  -X PUT -d '{\n    \"label\": \"New Label\"\n  }' \\\n  https://$api_root/$version/linode/stackscripts/$stackscript_id\n"},{"name":"python","value":"import stackscript\nTODO\n"}],"name":"PUT"},{"oauth":"stackscripts:delete","description":"Deletes this StackScript.  This action cannot be undone.\n","examples":[{"name":"curl","value":"curl -H \"Authorization: token $TOKEN\" \\\n  -X DELETE \\\n  https://$api_root/$version/linode/stackscripts/$stackscript_id\n"},{"name":"python","value":"import stackscript\nTODO\n"}],"name":"DELETE"}],"endpoints":null,"path":"linode/stackscripts/:id"}],"basePath":"/linode/stackscripts","methods":null};