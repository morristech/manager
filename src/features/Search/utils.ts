import { or } from 'ramda';

import DomainIcon from 'src/assets/addnewmenu/domain.svg';
import LinodeIcon from 'src/assets/addnewmenu/linode.svg';
import NodebalIcon from 'src/assets/addnewmenu/nodebalancer.svg';
import VolumeIcon from 'src/assets/addnewmenu/volume.svg';
import { Item } from 'src/components/EnhancedSelect/Select';
import { displayType, typeLabelLong } from 'src/features/linodes/presentation';

export interface SearchResults {
  linodes: Item[];
  volumes: Item[];
  nodebalancers: Item[];
  domains: Item[];
  images: Item[];
}

export const emptyResults = {
  linodes: [], nodebalancers: [], volumes: [], domains: [], images: []
}

export const iconMap = {
  'LinodeIcon': LinodeIcon,
  'NodebalIcon': NodebalIcon,
  'VolumeIcon': VolumeIcon,
  'DomainIcon': DomainIcon,
  'default': LinodeIcon,
}

// Helper can be extended to other entities once tags are supported for them.
// @todo Inefficient to call this function twice for each search result.
export const getMatchingTags = (tags:string[], query:string): string[] => {
  return tags.filter((tag:string) =>
    tag.toLocaleLowerCase().includes(query.toLowerCase()));
}

export const filterMatched = (query: string, label: string, tags: string[]) => {
  const matchingTags = getMatchingTags(tags, query);
  const bool = or(
    label.toLowerCase().includes(query.toLowerCase()),
    matchingTags.length > 0
  )
  return bool;
}

export const searchLinodes = (
  linodes: Linode.Linode[],
  query: string,
  typesData: Linode.LinodeType[],
  images: Linode.Image[],
  ) =>
  linodes.filter(linode => filterMatched(query, linode.label, linode.tags))
  .map(linode => ({
    label: linode.label,
    value: linode.id,
    data: {
      tags: linode.tags,
      description: linodeDescription(
        displayType(linode.type, typesData),
        linode.specs.memory,
        linode.specs.disk,
        linode.specs.vcpus,
        linode.image!,
        images,
      ),
      icon: 'LinodeIcon',
      path: `/linodes/${linode.id}`,
      searchText: query,
      created: linode.created,
      region: linode.region,
      status: linode.status,
    }
  })
)

export const searchVolumes = (volumes: Linode.Volume[], query: string) =>
  volumes.filter(volume => filterMatched(query, volume.label, volume.tags))
    .map(volume => ({
      label: volume.label,
      value: volume.id,
      data: {
        tags: volume.tags,
        description: volume.size + ' GiB',
        icon: 'VolumeIcon',
        path: `/volumes/${volume.id}`,
        searchText: query,
        created: volume.created,
        region: volume.region,
      }
}));

export const searchNodeBalancers = (nodebalancers: Linode.NodeBalancer[], query: string) =>
  nodebalancers.filter(
    nodebal => filterMatched(query, nodebal.label, nodebal.tags || []),
  ).map(nodebal => ({
    label: nodebal.label,
    value: nodebal.id,
    data: {
      tags: nodebal.tags,
      description: nodebal.hostname,
      icon: 'NodebalIcon',
      path: `/nodebalancers/${nodebal.id}`,
      searchText: query,
      created: nodebal.created
    }
}));

export const searchDomains = (domains: Linode.Domain[], query: string) =>
  domains.filter(
    domain => filterMatched(query, domain.domain, domain.tags))
      .map(domain => ({
        label: domain.domain,
        value: domain.id,
        data: {
          tags: domain.tags,
          description: domain.description || domain.status,
          icon: 'DomainIcon',
          path: `/domains/${domain.id}`,
          searchText: query,
        }
  }));

export const searchImages = (images: Linode.Image[], query: string) =>
  images.filter(
    (image: Linode.Image) => (
      /* TODO: this should be a pre-filter at the API level */
      image.is_public === false
      && image.label.toLowerCase().includes(query.toLowerCase())
    ),
  ).map((image: Linode.Image) => ({
    label: image.label,
    value: image.id,
    data: {
      tags: [],
      description: image.description || '',
      /* TODO: Update this with the Images icon! */
      icon: 'VolumeIcon',
      /* TODO: Choose a real location for this to link to */
      path: `/images`,
      searchText: query,
      created: image.created,
    }
  }));

  export const linodeDescription = (
    typeLabel: string,
    memory: number,
    disk: number,
    vcpus: number,
    imageId: string,
    images: Linode.Image[]
  ) => {
    const image = (images && images.find((img:Linode.Image) => img.id === imageId))
      || { label: 'Unknown Image' };
    const imageDesc = image.label;
    const typeDesc = typeLabelLong(typeLabel, memory, disk, vcpus);
    return `${imageDesc}, ${typeDesc}`;
  }

  export const searchAll = (
    _linodes: Linode.Linode[],
    _volumes: Linode.Volume[],
    _nodebalancers: Linode.NodeBalancer[],
    _domains: Linode.Domain[],
    _images: Linode.Image[],
    query: string,
    typesData: Linode.LinodeType[] = [],
  ) => {
    const linodes = searchLinodes(_linodes, query, typesData, _images);
    const volumes = searchVolumes(_volumes, query);
    const nodebalancers = searchNodeBalancers(_nodebalancers, query);
    const domains = searchDomains(_domains, query);
    const images = searchImages(_images, query);
    return {
      linodes,
      volumes,
      nodebalancers,
      domains,
      images
    }
  }
