"""Glance app utilities."""
# Copyright 2015 Solinea, Inc.
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
from goldstone.utils import TopologyMixin


class DiscoverTree(TopologyMixin):

    def __init__(self):
        from goldstone.glance.models import ImagesData

        self.images = ImagesData().get()

    def _get_image_regions(self):
        return set([s['region'] for s in self.images])

    def get_regions(self):
        from goldstone.utils import _get_region_for_glance_client, get_client

        keystone = get_client('keystone')['client']

        return [{"rsrcType": "region",
                 "label": _get_region_for_glance_client(keystone)}]

    def _populate_regions(self):

        result = []
        updated = self.images[0]['@timestamp']

        for region in self._get_image_regions():
            result.append(
                {"rsrcType": "region",
                 "label": region,
                 "info": {"last_updated": updated},
                 "children": [
                     {
                         "rsrcType": "images-leaf",
                         "label": "images",
                         "region": region,
                         "info": {
                             "last_update": updated
                         }
                     }
                 ]}
            )

        return result

    def build_topology_tree(self):
        from goldstone.utils import NoResourceFound

        try:
            if self.images is None or len(self.images.hits) == 0:
                raise NoResourceFound("No glance images found in database")

            regions = self._populate_regions()

            if len(regions) > 1:
                return {"rsrcType": "cloud",
                        "label": "Cloud",
                        "children": regions}
            else:
                return regions[0]

        except (IndexError, NoResourceFound):
            return {"rsrcType": "error", "label": "No data found"}


def reconcile_glance_hosts():
    """Update the Resource graph Glance nodes and edges from the current
    OpenStack cloud state.

    Glance nodes are:
       - deleted if they are no longer in the OpenStack cloud.
       - added if they are in the OpenStack cloud, but not in the graph.
       - updated from the cloud if they are already in the graph.

    """
    from goldstone.core.models import Image
    from goldstone.core.utils import process_resource_type

    process_resource_type(Image)
