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
from datetime import datetime

from django.db import models
import logging
from polymorphic import PolymorphicManager, PolymorphicQuerySet
from polymorphic.query import Polymorphic_QuerySet_objects_per_request
from goldstone.apps.core.models import Node, Event
from goldstone.apps.logging.es_models import LoggingNodeStats


__author__ = 'stanford'

logger = logging.getLogger(__name__)


class LoggingNode(Node):
    """
    This is a class that uses a core Node as the basis, then
    augments it with log related data such as counts by level for a time
    period.
    """
    error_count = 0
    warning_count = 0
    info_count = 0
    audit_count = 0
    debug_count = 0


class LoggingEvent(Event):
    """
    Represents an event harvested from the log event stream.
    """
    pass
