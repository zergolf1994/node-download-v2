#!/usr/bin/env bash
set -e
[[ ! "${1}" ]] && echo "Usage: download.sh [slug]" && exit 1
localip=$(hostname -I | awk '{print $1}')
rootpath="/home/node-download-v2-master"
slug=${1}
main_api_data="http://127.0.0.1:8888/data?slug=${slug}&sv_ip=${localip}"
call_main=$(curl -sS "$main_api_data")
status=$(echo $call_main | jq -r '.status')
folder_slug=${rootpath}/public/${slug}

if [[  "$status" == "false" ]]; then
    # Update Cancle File Process
    echo "STATUS FALSE"
else
    rm -rf ${folder_slug}
    mkdir -p ${folder_slug}

    cookie=$(echo $call_main | jq -r '.cookie')
    speed=$(echo $call_main | jq -r '.speed')
    folder=$(echo $call_main | jq -r '.folder')

    for files in '1080' '720' '480' '360' 'default'; do
        file_res="file_${files}"
        link=$(echo $call_main | jq -r ".${file_res}")
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
            curl -sS "http://127.0.0.1:8888/backup?slug=${slug}&quality=${files}&sv_ip=${localip}"
		    echo "${files} Backuped"
        fi
    done
    sleep 5
    rm -rf ${folder_slug}
    sleep 1
    curl -sS "http://127.0.0.1:8888/done?slug=${slug}"
    exit 1

fi