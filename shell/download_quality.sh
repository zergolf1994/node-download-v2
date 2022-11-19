#!/usr/bin/env bash
set -e
[[ ! "${1}" ]] && echo "Usage: download_quality.sh [slug]" && exit 1
slug=${1}
host_api="http://127.0.0.1:8888/data?slug=${slug}"
data=$(curl -sS "$host_api")
status=$(echo $data | jq -r '.status')

if [[  "$status" == "false" ]]; then
    err_api="http://127.0.0.1:8888/error?slug=${slug}&e_code=${error_code}"
	curl -sS "${err_api}"
    sleep 2
    exit 1
else
    rootpath=$(echo $data | jq -r '.dir')
    folder_slug=${rootpath}/public/${slug}
    
    rm -rf ${folder_slug}
    mkdir -p ${folder_slug}

    cookie=$(echo $data | jq -r '.cookie')
    speed=$(echo $data | jq -r '.speed')
    folder=$(echo $data | jq -r '.folder')

    sudo bash ${rootpath}/shell/update_val.sh ${slug} > /dev/null &

    for files in '1080' '720' '480' '360' 'default'; do
        file_res="file_${files}"
        link=$(echo $data | jq -r ".${file_res}")

        if [[ $link != 'null' ]]; then
            
            tf=${folder_slug}/${slug}_${file_res}.mp4
            tdl=${folder_slug}/dl_${slug}_${file_res}.txt
            tup=${folder_slug}/up_${slug}_${file_res}.txt

            if [[ -f "$tf" ]]; then
            rm -rf ${tf}
            fi
            if [[ -f "$tdl" ]]; then
                rm -rf ${tdl}
            fi
            if [[ -f "$tup" ]]; then
                rm -rf ${tup}
            fi

            if [ "${cookie}" != "null" ]
            then
                axel -H "Cookie: ${cookie}" -n ${speed} -o "${tf}" "${link}" >> ${tdl} 2>&1
            else
                axel -n ${speed} -o "${tf}" "${link}" >> ${tdl} 2>&1
            fi

            echo "${files} Downloaded"
            sleep 2
            sudo -u root gdrive upload --parent ${folder} ${tf} >> ${tup} 2>&1
            echo "${files} Uploaded"
            sleep 2
            curl -sS "http://127.0.0.1:8888/backup?slug=${slug}&quality=${files}"
		    echo "${files} Backuped"
        fi
    done
    sleep 5
    rm -rf ${folder_slug}
    sleep 1
    curl -sS "http://127.0.0.1:8888/done?slug=${slug}"
    exit 1
fi