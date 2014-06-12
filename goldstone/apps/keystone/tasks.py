from __future__ import absolute_import
# Copyright 2014 Solinea, Inc.
#
# Licensed under the Solinea Software License Agreement (goldstone),
# Version 1.0 (the "License"); you may not use this file except in compliance
# with the License. You may obtain a copy of the License at:
#
#     http://www.solinea.com/goldstone/LICENSE.pdf
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

import pytz

__author__ = 'John Stanford'

from django.conf import settings
from goldstone.celery import app as celery_app
import requests
import logging
from datetime import datetime
import json
from .models import *
from goldstone.utils import _construct_api_rec, \
    _get_keystone_client, to_es_date, get_region_for_keystone_client

logger = logging.getLogger(__name__)


@celery_app.task(bind=True)
def time_keystone_api(self):
    """
    Call the token url via http rather than the python client so we can get
    a full set of data for the record in the DB.  This will make things
    easier to model.
    """
    user = settings.OS_USERNAME
    passwd = settings.OS_PASSWORD
    url = settings.OS_AUTH_URL + "/tokens"
    payload = {"auth": {"passwordCredentials": {"username": user,
                                                "password": passwd}}}
    headers = {'content-type': 'application/json'}
    self.reply = requests.post(url, data=json.dumps(payload),
                               headers=headers)
    t = datetime.utcnow()
    rec = _construct_api_rec(self.reply, "keystone", t)
    apidb = ApiPerfData()
    rec_id = apidb.post(rec)
    return {
        'id': rec_id,
        'record': rec
    }


def _update_keystone_records(rec_type, region, db, items):

    # image list is a generator, so we need to make it not sol lazy it...
    body = {"@timestamp": to_es_date(datetime.now(tz=pytz.utc)),
            "region": region,
            rec_type: [item.to_dict() for item in items]}
    try:
        db.post(body)
    except Exception as e:
        logging.exception(e)
        logger.warn("failed to index keystone %s", rec_type)


@celery_app.task(bind=True)
def discover_keystone_topology(self):
    access = _get_keystone_client()
    cl = access['client']
    reg = get_region_for_keystone_client(cl)

    _update_keystone_records("endpoints",  reg, EndpointsData(),
                             cl.endpoints.list())
    _update_keystone_records("roles",  reg, RolesData(),
                             cl.roles.list())
    _update_keystone_records("services",  reg, ServicesData(),
                             cl.services.list())
    _update_keystone_records("tenants",  reg, TenantsData(),
                             cl.tenants.list())
    _update_keystone_records("users",  reg, UsersData(),
                             cl.users.list())
